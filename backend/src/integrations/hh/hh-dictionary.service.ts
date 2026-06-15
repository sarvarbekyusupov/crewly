import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HhArea, HhDictionaries } from './hh.types';
import { HH_BASE_URL, HH_HOST } from './hh.constants';

const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class HhDictionaryService {
  private readonly logger = new Logger(HhDictionaryService.name);
  private readonly baseUrl = HH_BASE_URL;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();

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

    // Deduplicate concurrent cache misses — only one HTTP call per key at a time
    let promise = this.inflight.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = firstValueFrom(
        this.http.get<T>(url, {
          headers: this.headers,
          params: { host: HH_HOST },
        }),
      )
        .then((res) => {
          this.cache.set(key, {
            data: res.data,
            expiresAt: Date.now() + TTL_MS,
          });
          this.logger.debug({ key }, 'HH dictionary refreshed');
          return res.data;
        })
        .finally(() => {
          this.inflight.delete(key);
        });
      this.inflight.set(key, promise);
    }

    return promise;
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
