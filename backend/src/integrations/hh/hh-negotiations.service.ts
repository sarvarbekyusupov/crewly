import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface HhNegotiationItem {
  id: string;
  state: { id: string; name: string };
  resume: { id: string };
  vacancy: { id: string };
  created_at: string;
  updated_at: string;
}

export interface HhNegotiationMessage {
  id: string;
  text: string;
  created_at: string;
  author: { participant_type: string };
}

export interface HhEmployerState {
  id: string;
  name: string;
}

@Injectable()
export class HhNegotiationsService {
  private readonly logger = new Logger(HhNegotiationsService.name);
  private readonly baseUrl = 'https://api.hh.ru';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };
  }

  /**
   * Fetch the pipeline stage collections for a vacancy.
   * Must be called before any negotiation work to know valid collection IDs.
   */
  async getVacancyCollections(vacancyId: string): Promise<HhEmployerState[]> {
    const response = await firstValueFrom(
      this.http.get<{ states: HhEmployerState[] }>(
        `${this.baseUrl}/negotiations/employer_states`,
        { params: { vacancy_id: vacancyId }, headers: this.headers },
      ),
    );
    return response.data.states ?? [];
  }

  /**
   * Fetch all responses/applications for a vacancy.
   */
  async getVacancyResponses(
    vacancyId: string,
    opts: { status?: string; page?: number; perPage?: number } = {},
  ): Promise<{ items: HhNegotiationItem[]; pages: number; page: number }> {
    const response = await firstValueFrom(
      this.http.get<{
        items: HhNegotiationItem[];
        pages: number;
        page: number;
      }>(`${this.baseUrl}/negotiations`, {
        params: {
          vacancy_id: vacancyId,
          order_by: 'updated_at',
          per_page: opts.perPage ?? 100,
          page: opts.page ?? 0,
          ...(opts.status && { status: opts.status }),
        },
        headers: this.headers,
      }),
    );
    return response.data;
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
    const employerId = this.config.get<string>('HH_EMPLOYER_ID') ?? '';
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
      'HH-User-Agent': userAgent,
    };

    // Step 1: fetch available invitation actions for this vacancy+resume combo
    const actionsResp = await firstValueFrom(
      this.http.get<{
        items: Array<{
          negotiations_actions: Array<{
            id: string;
            enabled: boolean;
            method: string;
            url: string;
            arguments: Array<{ id: string; required: boolean }>;
          }>;
        }>;
      }>(
        `${this.baseUrl}/employers/${employerId}/vacancies/active`,
        {
          params: { resume_id: params.resumeId },
          headers: authHeaders,
        },
      ),
    );

    const vacancyItem = actionsResp.data.items?.find(
      (v: any) => v.id === params.vacancyId,
    );
    const action = vacancyItem?.negotiations_actions?.find(
      (a) => a.enabled,
    );

    if (!action) {
      throw new Error(
        `No enabled invitation action found for vacancy ${params.vacancyId} and resume ${params.resumeId}`,
      );
    }

    // Step 2: execute the action using its dynamic URL and method
    const queryParams: Record<string, string> = {
      resume_id: params.resumeId,
      vacancy_id: params.vacancyId,
      message: params.message,
    };

    const response = await firstValueFrom(
      this.http.request({
        method: action.method,
        url: action.url,
        params: queryParams,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
      }),
    );

    const location: string = response.headers['location'] ?? '';
    const negotiationId = location.split('/').pop() ?? 'unknown';
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
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/negotiations/${collection}/${negotiationId}`,
        { ...(message && { message }) },
        { headers: this.headers },
      ),
    );
    this.logger.log(
      { negotiationId, collection },
      'HH negotiation stage moved',
    );
  }

  /**
   * Send a message in an existing negotiation thread.
   * NOTE: HH deprecated this endpoint — new chat features won't appear here.
   * Migrate to HH Chats API when HH publishes the replacement REST spec.
   */
  async sendMessage(negotiationId: string, message: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/negotiations/${negotiationId}/messages`,
        { message },
        { headers: this.headers },
      ),
    );
  }

  /**
   * Get the current pipeline state of a single employer-side negotiation.
   */
  async getEmployerNegotiationState(
    negotiationId: string,
  ): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ state?: { id: string } }>(
          `${this.baseUrl}/negotiations/${negotiationId}`,
          { headers: this.headers },
        ),
      );
      return response.data?.state?.id ?? null;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) throw err;
      throw err;
    }
  }

  /**
   * Fetch the full message thread for a negotiation.
   * NOTE: HH deprecated this endpoint — new chat features won't appear here.
   * Migrate to HH Chats API when HH publishes the replacement REST spec.
   */
  async getMessages(negotiationId: string): Promise<HhNegotiationMessage[]> {
    const response = await firstValueFrom(
      this.http.get<{ items: HhNegotiationMessage[] }>(
        `${this.baseUrl}/negotiations/${negotiationId}/messages`,
        { headers: this.headers },
      ),
    );
    return response.data.items ?? [];
  }
}
