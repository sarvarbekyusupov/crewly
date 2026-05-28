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
    const userAgent =
      this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
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
   * Returns the negotiation ID for tracking.
   */
  async inviteCandidate(params: {
    vacancyId: string;
    resumeId: string;
    message: string;
  }): Promise<string> {
    const userAgent =
      this.config.get<string>('HH_USER_AGENT') ?? 'my-hr/1.0';
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');

    const response = await firstValueFrom(
      this.http.post(
        `${this.baseUrl}/negotiations`,
        {
          vacancy_id: params.vacancyId,
          resume_id: params.resumeId,
          message: params.message,
          send_sms: false,
          notify_applicant: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': userAgent,
            'HH-User-Agent': userAgent,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    // HH returns 201 with Location header: /negotiations/{id}
    const location: string = response.headers['location'] ?? '';
    const negotiationId = location.split('/').pop() ?? 'unknown';
    this.logger.log(
      { vacancyId: params.vacancyId, resumeId: params.resumeId, negotiationId },
      'HH candidate invited',
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
