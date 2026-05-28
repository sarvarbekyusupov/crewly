import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CandidateSourceAdapter,
  AdapterSearchParams,
  AdapterFetchResult,
  NormalizedProfile,
} from '../adapters/candidate-source.adapter';
import {
  LinkedInSearchResponse,
  LinkedInProfile,
  LinkedInSearchParams,
} from './linkedin.types';

@Injectable()
export class LinkedInAdapter extends CandidateSourceAdapter {
  private readonly logger = new Logger(LinkedInAdapter.name);
  readonly sourceName = 'linkedin';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  private get apiKey(): string {
    return this.config.get<string>('LINKEDIN_RAPIDAPI_KEY') ?? '';
  }

  private get apiHost(): string {
    return (
      this.config.get<string>('LINKEDIN_RAPIDAPI_HOST') ??
      'fresh-linkedin-profile-data.p.rapidapi.com'
    );
  }

  private get headers() {
    return {
      'x-rapidapi-key': this.apiKey,
      'x-rapidapi-host': this.apiHost,
    };
  }

  async fetchPage(params: AdapterSearchParams): Promise<AdapterFetchResult> {
    if (!this.apiKey) {
      throw new Error('LINKEDIN_RAPIDAPI_KEY not configured');
    }

    const searchParams: LinkedInSearchParams = {
      keywords: params.query,
      location: params.location,
      page: params.page + 1, // RapidAPI is 1-indexed
    };

    const response = await firstValueFrom(
      this.http.get<LinkedInSearchResponse>(
        `https://${this.apiHost}/search-people`,
        {
          params: searchParams,
          headers: this.headers,
        },
      ),
    );

    const data = response.data;
    if (!data.success || !Array.isArray(data.data)) {
      this.logger.warn(
        { message: data.message },
        'LinkedIn search returned no results',
      );
      return { profiles: [], hasMore: false };
    }

    const profiles: NormalizedProfile[] = data.data.map((p) =>
      this.normalize(p),
    );
    const perPage = 10; // RapidAPI default page size
    const hasMore = data.data.length >= perPage;

    return { profiles, hasMore };
  }

  private normalize(p: LinkedInProfile): NormalizedProfile {
    const fullName =
      p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' ');
    const profileId = p.profile_id ?? this.extractProfileId(p.linkedin_url);

    return {
      externalId: profileId ?? fullName.toLowerCase().replace(/\s+/g, '-'),
      sourceUrl: p.linkedin_url,
      fullName,
      email: p.email,
      phone: p.phone,
      rawText: this.buildRawText(p),
      city: p.city ?? p.location,
      rawPayload: p,
    };
  }

  private extractProfileId(url?: string): string | undefined {
    if (!url) return undefined;
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    return match?.[1];
  }

  private buildRawText(p: LinkedInProfile): string {
    const parts: string[] = [];
    const fullName =
      p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' ');
    if (fullName) parts.push(`Name: ${fullName}`);
    if (p.headline) parts.push(`Headline: ${p.headline}`);
    if (p.location) parts.push(`Location: ${p.location}`);
    if (p.summary) parts.push(`Summary: ${p.summary}`);
    if (p.skills?.length) parts.push(`Skills: ${p.skills.join(', ')}`);

    if (p.experiences?.length) {
      parts.push('\nExperience:');
      for (const exp of p.experiences) {
        const start = exp.starts_at?.year ?? '';
        const end = exp.ends_at?.year ?? 'present';
        parts.push(`  ${exp.title} at ${exp.company} (${start} - ${end})`);
        if (exp.description) parts.push(`  ${exp.description.slice(0, 300)}`);
      }
    }

    if (p.educations?.length) {
      parts.push('\nEducation:');
      for (const edu of p.educations) {
        parts.push(
          `  ${edu.degree_name ?? ''} ${edu.field_of_study ?? ''} at ${edu.school ?? ''}`,
        );
      }
    }

    return parts.join('\n');
  }
}
