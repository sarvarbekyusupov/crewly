import { Injectable, Logger } from '@nestjs/common';
import { HhClientService } from './hh-client.service';
import { HhQuotaError } from './hh-errors';
import { runConcurrentCapped, withRetry } from '../../common/utils/async.utils';
import {
  CandidateSourceAdapter,
  AdapterSearchParams,
  AdapterFetchResult,
  NormalizedProfile,
} from '../adapters/candidate-source.adapter';

@Injectable()
export class HhAdapter extends CandidateSourceAdapter {
  readonly sourceName = 'hh.ru'; // must match processors and DB queries which use 'hh.ru'
  private readonly logger = new Logger(HhAdapter.name);

  constructor(private readonly hh: HhClientService) {
    super();
  }

  async fetchPage(params: AdapterSearchParams): Promise<AdapterFetchResult> {
    const list = await this.hh.searchResumes({
      text: params.query,
      specialization: params.specialization,
      ...(params.location &&
        /^\d+$/.test(params.location) && { area: params.location }),
      page: params.page,
    });

    const profiles: NormalizedProfile[] = [];

    let quotaHit = false;
    await runConcurrentCapped(list.items, 3, async (item) => {
      if (quotaHit) return;
      let detail: Awaited<ReturnType<HhClientService['getResume']>> | null =
        null;
      try {
        detail = await withRetry(() => this.hh.getResume(item.id));
      } catch (err: any) {
        if (err instanceof HhQuotaError) {
          quotaHit = true;
          this.logger.warn(
            { resumeId: item.id },
            'HH quota hit — stopping page fetch',
          );
        } else {
          this.logger.warn(
            { resumeId: item.id, error: err.message },
            'Failed to fetch resume detail from HH',
          );
        }
        return;
      }
      if (!detail) return;

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
    });

    return {
      profiles,
      hasMore: list.page < list.pages - 1,
    };
  }
}
