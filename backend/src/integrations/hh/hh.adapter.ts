import { Injectable } from '@nestjs/common';
import { HhClientService } from './hh-client.service';
import {
  CandidateSourceAdapter,
  AdapterSearchParams,
  AdapterFetchResult,
  NormalizedProfile,
} from '../adapters/candidate-source.adapter';

@Injectable()
export class HhAdapter extends CandidateSourceAdapter {
  readonly sourceName = 'hh.ru';

  constructor(private readonly hh: HhClientService) {
    super();
  }

  async fetchPage(params: AdapterSearchParams): Promise<AdapterFetchResult> {
    const list = await this.hh.searchResumes({
      text: params.query,
      specialization: params.specialization,
      area: params.location,
      page: params.page,
    });

    const profiles: NormalizedProfile[] = [];

    for (const item of list.items) {
      let detail: Awaited<ReturnType<HhClientService['getResume']>> | null =
        null;
      try {
        detail = await this.hh.getResume(item.id);
      } catch {
        // Skip profiles that can't be fetched
      }
      // Respect hh.ru rate limit
      await new Promise((r) => setTimeout(r, 300));
      if (!detail) continue;

      const fullName = [detail.first_name, detail.last_name]
        .filter(Boolean)
        .join(' ');

      profiles.push({
        externalId: item.id,
        sourceUrl: item.url,
        fullName,
        email: this.hh.extractEmail(detail),
        phone: this.hh.extractPhone(detail),
        rawText: this.hh.extractResumeText(detail),
        city: detail.area?.name,
        expectedSalaryUzs:
          detail.salary?.currency === 'UZS'
            ? BigInt(detail.salary.amount)
            : undefined,
        rawPayload: detail,
      });
    }

    return {
      profiles,
      hasMore: list.page < list.pages - 1,
    };
  }
}
