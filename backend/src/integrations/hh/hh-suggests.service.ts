import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HH_BASE_URL, HH_HOST } from './hh.constants';

export interface HhSuggestItem {
  id: string;
  text: string;
  acronym?: string;
}

@Injectable()
export class HhSuggestsService {
  private readonly logger = new Logger(HhSuggestsService.name);
  private readonly baseUrl = HH_BASE_URL;

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
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async skills(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/skill_set`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async universities(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/educational_institutions`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async positions(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/positions`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async areaLeaves(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/area_leaves`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async fieldsOfStudy(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/fields_of_study`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async professionalRoles(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/professional_roles`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }

  async vacancyPositions(text: string): Promise<HhSuggestItem[]> {
    if (!text?.trim()) return [];
    const res = await firstValueFrom(
      this.http.get<{ items: HhSuggestItem[] }>(
        `${this.baseUrl}/suggests/vacancy_positions`,
        { params: { host: HH_HOST, text }, headers: this.headers },
      ),
    );
    return res.data.items ?? [];
  }
}
