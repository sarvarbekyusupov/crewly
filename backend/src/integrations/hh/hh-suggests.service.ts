import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface HhSuggestItem {
  id: string;
  text: string;
  acronym?: string;
}

@Injectable()
export class HhSuggestsService {
  private readonly baseUrl = 'https://api.hh.ru';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const ua = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    return { 'User-Agent': ua, 'HH-User-Agent': ua };
  }

  async areas(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/areas`,
        { params: { text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async skills(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/skill_set`,
        { params: { text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async universities(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/educational_institutions`,
        { params: { text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }
}
