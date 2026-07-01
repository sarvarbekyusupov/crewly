import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HH_BASE_URL, HH_HOST } from './hh.constants';
import type {
  HhChat,
  HhChatMessage,
  HhChatParticipant,
  HhChatsResponse,
  HhChatMessagesResponse,
} from './hh.types';

export type {
  HhChat,
  HhChatMessage,
  HhChatParticipant,
  HhChatsResponse,
  HhChatMessagesResponse,
};

@Injectable()
export class HhChatService {
  private readonly logger = new Logger(HhChatService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get ua(): string {
    return (
      this.config.get<string>('HH_USER_AGENT') ??
      'Crewly/1.0 (contact@crewly.uz)'
    );
  }

  private authHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'User-Agent': this.ua,
      'HH-User-Agent': this.ua,
    };
  }

  private get employerToken(): string {
    const t = this.config.get<string>('HH_EMPLOYER_TOKEN');
    if (!t) throw new Error('HH_EMPLOYER_TOKEN not configured');
    return t;
  }

  /** GET /common/chats — list chats for the connected candidate (applicant token) */
  async listChatsForApplicant(
    token: string,
    params?: { page?: number; per_page?: number },
  ): Promise<HhChatsResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhChatsResponse>(`${this.baseUrl}/common/chats`, {
        headers: this.authHeaders(token),
        params: { host: HH_HOST, per_page: 50, page: 0, ...params },
      }),
    );
    return resp.data;
  }

  /** GET /common/chats — list chats for employer */
  async listChats(params?: {
    page?: number;
    per_page?: number;
    filter_unread?: boolean;
    filter_with_vacancy_ids?: string;
    vacancy_status?: string;
  }): Promise<HhChatsResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhChatsResponse>(`${this.baseUrl}/common/chats`, {
        headers: this.authHeaders(this.employerToken),
        params: { host: HH_HOST, per_page: 50, page: 0, ...params },
      }),
    );
    return resp.data;
  }

  /** GET /common/chats/{id}/messages */
  async getChatMessages(
    token: string,
    chatId: string,
    params?: {
      limit?: number;
      order?: 'next' | 'prev';
      start_message_id?: string;
    },
  ): Promise<HhChatMessagesResponse> {
    const resp = await firstValueFrom(
      this.http.get<HhChatMessagesResponse>(
        `${this.baseUrl}/common/chats/${chatId}/messages`,
        {
          headers: this.authHeaders(token),
          params: { host: HH_HOST, limit: 50, order: 'prev', ...params },
        },
      ),
    );
    return resp.data;
  }

  /** POST /common/chats/{id}/messages — send message; idempotencyKey must be a UUID */
  async sendChatMessage(
    token: string,
    chatId: string,
    text: string,
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    const resp = await firstValueFrom(
      this.http.post<{ id: string }>(
        `${this.baseUrl}/common/chats/${chatId}/messages`,
        { text, idempotency_key: idempotencyKey },
        {
          headers: {
            ...this.authHeaders(token),
            'Content-Type': 'application/json',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ chatId }, 'HH chat message sent');
    return resp.data;
  }

  /** PUT /common/chats/{id}/message/{msgId}/read — mark last-read message */
  async markMessageRead(
    token: string,
    chatId: string,
    messageId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/common/chats/${chatId}/message/${messageId}/read`,
        {},
        { headers: this.authHeaders(token), params: { host: HH_HOST } },
      ),
    );
  }

  /** GET /common/chats/counters/unread */
  async getUnreadCount(token: string): Promise<number> {
    const resp = await firstValueFrom(
      this.http.get<{ unread_chats_count: string }>(
        `${this.baseUrl}/common/chats/counters/unread`,
        { headers: this.authHeaders(token), params: { host: HH_HOST } },
      ),
    );
    return Number(resp.data.unread_chats_count ?? 0);
  }

  /**
   * Find the chatId for a given HH negotiation.
   * Paginates /common/chats and matches chat.negotiation.id.
   * Returns null if not found (caller should fall back to deprecated endpoint).
   */
  async findChatIdByNegotiationId(
    token: string,
    negotiationId: string,
  ): Promise<string | null> {
    let page = 0;
    while (true) {
      const resp = await firstValueFrom(
        this.http.get<HhChatsResponse>(`${this.baseUrl}/common/chats`, {
          headers: this.authHeaders(token),
          params: { host: HH_HOST, per_page: 50, page },
        }),
      );
      const match = resp.data.items?.find(
        (c) => c.negotiation?.id === negotiationId,
      );
      if (match) return match.id;
      if (page >= (resp.data.pages ?? 1) - 1) break;
      page++;
    }
    return null;
  }

  /** POST /common/chats/without_vacancy — employer direct outreach linked to a resume hash */
  async createChatWithoutVacancy(
    resumeHash: string,
    firstMessage: string,
  ): Promise<{ chat_id: string }> {
    const resp = await firstValueFrom(
      this.http.post<{ chat_id: string }>(
        `${this.baseUrl}/common/chats/without_vacancy`,
        { first_message: firstMessage, resume_hash: resumeHash },
        {
          headers: {
            ...this.authHeaders(this.employerToken),
            'Content-Type': 'application/json',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ resumeHash }, 'HH direct chat created without vacancy');
    return resp.data;
  }

  /** GET /common/chats/{id}/participants */
  async getChatParticipants(
    token: string,
    chatId: string,
  ): Promise<HhChatParticipant[]> {
    const resp = await firstValueFrom(
      this.http.get<{ items: HhChatParticipant[] }>(
        `${this.baseUrl}/common/chats/${chatId}/participants`,
        { headers: this.authHeaders(token), params: { host: HH_HOST } },
      ),
    );
    return resp.data.items ?? [];
  }

  /** PUT /common/chats/{id}/write_possibility — toggle applicant messaging in the chat */
  async setApplicantWritePossibility(
    chatId: string,
    allowed: boolean,
  ): Promise<void> {
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/common/chats/${chatId}/write_possibility`,
        {},
        {
          headers: this.authHeaders(this.employerToken),
          params: { host: HH_HOST, applicant_write_possibility: allowed },
        },
      ),
    );
    this.logger.log({ chatId, allowed }, 'HH chat write_possibility updated');
  }

  /** PUT /common/chats/{id}/leave — employer leaves the chat */
  async leaveChat(chatId: string): Promise<void> {
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/common/chats/${chatId}/leave`,
        {},
        {
          headers: this.authHeaders(this.employerToken),
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ chatId }, 'HH chat left');
  }

  /** PUT /common/chats/{id}/messages/{messageId} — edit an existing message */
  async editChatMessage(
    token: string,
    chatId: string,
    messageId: string,
    text: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.put(
        `${this.baseUrl}/common/chats/${chatId}/messages/${messageId}`,
        { text },
        {
          headers: {
            ...this.authHeaders(token),
            'Content-Type': 'application/json',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    this.logger.log({ chatId, messageId }, 'HH chat message edited');
  }

  /** DELETE /common/chats/{id}/messages/{messageId} — delete a message */
  async deleteChatMessage(
    token: string,
    chatId: string,
    messageId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete(
        `${this.baseUrl}/common/chats/${chatId}/messages/${messageId}`,
        { headers: this.authHeaders(token), params: { host: HH_HOST } },
      ),
    );
    this.logger.log({ chatId, messageId }, 'HH chat message deleted');
  }

  /**
   * POST /common/chats/files/upload_links — request presigned upload URLs for file attachments.
   * files: array of { name, size, content_type } objects.
   * Returns array of upload link objects.
   */
  async getFileUploadLinks(
    token: string,
    files: Array<{ name: string; size: number; content_type: string }>,
  ): Promise<unknown[]> {
    const resp = await firstValueFrom(
      this.http.post<{ upload_links: unknown[] }>(
        `${this.baseUrl}/common/chats/files/upload_links`,
        { files },
        {
          headers: {
            ...this.authHeaders(token),
            'Content-Type': 'application/json',
          },
          params: { host: HH_HOST },
        },
      ),
    );
    return resp.data.upload_links ?? [];
  }
}
