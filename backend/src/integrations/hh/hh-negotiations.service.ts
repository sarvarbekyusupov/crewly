import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HH_BASE_URL } from './hh.constants';
import { runConcurrentCapped, withRetry } from '../../common/utils/async.utils';

export interface HhNegotiationItem {
  id: string;
  state: { id: string; name: string };
  resume: { id: string };
  vacancy: { id: string };
  created_at: string;
  updated_at: string;
}

export interface HhEmployerState {
  id: string;
  name: string;
}

interface VacancyActionItem {
  id: string;
  negotiations_actions: Array<{
    id: string;
    enabled: boolean;
    method: string;
    url: string;
    arguments: Array<{ id: string; required: boolean }>;
  }>;
}

interface ActiveVacanciesResp {
  items: VacancyActionItem[];
  pages: number;
  page: number;
}

@Injectable()
export class HhNegotiationsService {
  private readonly logger = new Logger(HhNegotiationsService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };
  }

  /**
   * Fetch employer pipeline states for a vacancy.
   * GET /negotiations?vacancy_id= returns {collections, states} — extract states.
   */
  async getVacancyCollections(vacancyId: string): Promise<HhEmployerState[]> {
    const response = await withRetry(() =>
      firstValueFrom(
        this.http.get<{ states?: HhEmployerState[]; collections?: unknown[] }>(
          `${this.baseUrl}/negotiations`,
          { params: { vacancy_id: vacancyId }, headers: this.headers },
        ),
      ),
    );
    return response.data.states ?? [];
  }

  /**
   * Fetch all inbound negotiations for a vacancy by iterating every collection.
   * GET /negotiations?vacancy_id= returns {collections:[{url}]} not items.
   * Items live at each collection.url — fetched with concurrency cap of 5.
   */
  async getVacancyResponses(
    vacancyId: string,
    opts: { perPage?: number } = {},
  ): Promise<{ items: HhNegotiationItem[] }> {
    // Step 1: get collection URLs for this vacancy
    const collectionsResp = await withRetry(() =>
      firstValueFrom(
        this.http.get<{
          collections?: Array<{ id: string; url: string }>;
        }>(`${this.baseUrl}/negotiations`, {
          params: { vacancy_id: vacancyId },
          headers: this.headers,
        }),
      ),
    );

    const collections = collectionsResp.data.collections ?? [];
    if (!collections.length) return { items: [] };

    // Step 2: fetch all pages from every collection, max 5 concurrent
    const allItems: HhNegotiationItem[] = [];
    await runConcurrentCapped(collections, 5, async (col) => {
      let page = 0;
      try {
        while (true) {
          const res = await withRetry(() =>
            firstValueFrom(
              this.http.get<{
                items?: HhNegotiationItem[];
                pages?: number;
                page?: number;
              }>(col.url, {
                params: { per_page: opts.perPage ?? 100, page },
                headers: this.headers,
              }),
            ),
          );
          allItems.push(...(res.data.items ?? []));
          if (page >= (res.data.pages ?? 1) - 1) break;
          page++;
        }
      } catch (err: any) {
        this.logger.warn(
          { collectionId: col.id, err: err.message },
          'Failed to fetch HH negotiation collection',
        );
      }
    });

    // Deduplicate across collections — same negotiation can appear in multiple buckets
    const seen = new Set<string>();
    const unique = allItems.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return { items: unique };
  }

  /**
   * Invite a candidate to apply (employer → candidate invitation).
   * Fetches available action URLs from HH first, then executes the first enabled action.
   * Returns the negotiation ID for tracking.
   */
  async inviteCandidate(params: {
    vacancyId: string;
    resumeId: string;
    message: string;
  }): Promise<string> {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    if (!token) {
      throw new Error('HH_EMPLOYER_TOKEN is not configured');
    }
    const employerId = this.config.get<string>('HH_EMPLOYER_ID');
    if (!employerId) throw new Error('HH_EMPLOYER_ID must be configured');
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };

    // Step 1: paginate until the target vacancyId is found
    let vacancyItem: VacancyActionItem | undefined;
    let page = 0;
    let totalPages = 1;
    while (!vacancyItem && page < totalPages) {
      const actionsResp = await withRetry(() =>
        firstValueFrom(
          this.http.get<ActiveVacanciesResp>(
            `${this.baseUrl}/employers/${employerId}/vacancies/active`,
            {
              params: { resume_id: params.resumeId, per_page: 100, page },
              headers: authHeaders,
            },
          ),
        ),
      );
      vacancyItem = actionsResp.data.items?.find(
        (v) => v.id === params.vacancyId,
      );
      totalPages = actionsResp.data.pages ?? 1;
      page++;
    }

    const action = vacancyItem?.negotiations_actions?.find((a) => a.enabled);

    if (!action) {
      throw new Error(
        `No enabled invitation action found for vacancy ${params.vacancyId} and resume ${params.resumeId}`,
      );
    }

    // Guard against SSRF: action URL must point to the known HH API host
    const allowedHost = new URL(this.baseUrl).host;
    const actionHost = new URL(action.url).host;
    if (actionHost !== allowedHost) {
      throw new Error(
        `HH action URL points to unexpected host: ${actionHost} (expected ${allowedHost})`,
      );
    }

    const payload = {
      resume_id: params.resumeId,
      vacancy_id: params.vacancyId,
      message: params.message,
    };
    const isGet = action.method.toUpperCase() === 'GET';

    // Step 2: execute the action using its dynamic URL and method.
    // Only retry idempotent methods — POST creates a negotiation and must not be retried
    // (HH may succeed then return 5xx, causing a duplicate negotiation on retry).
    const isSafe = ['GET', 'PUT', 'DELETE'].includes(
      action.method.toUpperCase(),
    );
    const request = () =>
      firstValueFrom(
        this.http.request({
          method: action.method,
          url: action.url,
          ...(isGet ? { params: payload } : { data: payload }),
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
        }),
      );
    const response = isSafe ? await withRetry(request) : await request();

    const location: string = response.headers['location'] ?? '';
    const negotiationId = location.split('/').pop();
    if (!negotiationId) {
      throw new Error(
        `HH invitation succeeded but returned no Location header for vacancy ${params.vacancyId}`,
      );
    }

    this.logger.log(
      {
        vacancyId: params.vacancyId,
        resumeId: params.resumeId,
        action: action.id,
        negotiationId,
      },
      'HH candidate invited via action URL',
    );
    return negotiationId;
  }

  /**
   * Move a candidate to a different pipeline stage.
   * collection = stage ID from getVacancyCollections (e.g. "interview", "offer")
   */
  async moveNegotiation(
    collection: string,
    negotiationId: string,
    message?: string,
  ): Promise<void> {
    await withRetry(() =>
      firstValueFrom(
        this.http.put(
          `${this.baseUrl}/negotiations/${collection}/${negotiationId}`,
          { ...(message && { message }) },
          { headers: { ...this.headers, 'Content-Type': 'application/json' } },
        ),
      ),
    );
    this.logger.log(
      { negotiationId, collection },
      'HH negotiation stage moved',
    );
  }

  /**
   * Get the current pipeline state of a single employer-side negotiation.
   */
  async getEmployerNegotiationState(
    negotiationId: string,
  ): Promise<string | null> {
    const response = await firstValueFrom(
      this.http.get<{ state?: { id: string } }>(
        `${this.baseUrl}/negotiations/${negotiationId}`,
        { headers: this.headers },
      ),
    );
    return response.data?.state?.id ?? null;
  }
}
