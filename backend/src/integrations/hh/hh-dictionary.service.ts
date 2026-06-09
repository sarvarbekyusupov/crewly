import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HhArea, HhDictionaries } from './hh.types';

const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class HhDictionaryService {
  private readonly logger = new Logger(HhDictionaryService.name);
  private readonly baseUrl = 'https://api.hh.uz';
  private readonly cache = new Map<string, CacheEntry<any>>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const userAgent = this.config.get<string>('HH_USER_AGENT') ?? 'crewly/1.0';
    return { 'User-Agent': userAgent, 'HH-User-Agent': userAgent };
  }

  private async fetchCached<T>(key: string, url: string): Promise<T> {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.data as T;
    const res = await firstValueFrom(
      this.http.get<T>(url, { headers: this.headers }),
    );
    this.cache.set(key, { data: res.data, expiresAt: Date.now() + TTL_MS });
    this.logger.debug({ key }, 'HH dictionary refreshed');
    return res.data;
  }

  getAreas(): Promise<HhArea[]> {
    return this.fetchCached<HhArea[]>('areas', `${this.baseUrl}/areas`);
  }

  getDictionaries(): Promise<HhDictionaries> {
    return this.fetchCached<HhDictionaries>(
      'dictionaries',
      `${this.baseUrl}/dictionaries`,
    );
  }
}
