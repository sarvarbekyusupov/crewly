import { Injectable } from '@nestjs/common';
import { LinkedInAdapter } from '../../integrations/linkedin/linkedin-client.service';
import {
  LinkedInSearchResponse,
  LinkedInProfile,
} from '../../integrations/linkedin/linkedin.types';
import { AdapterIngestService } from '../../integrations/adapters/adapter-ingest.service';
import { NormalizedProfile } from '../../integrations/adapters/candidate-source.adapter';

@Injectable()
export class SourcingService {
  constructor(
    private readonly linkedinAdapter: LinkedInAdapter,
    private readonly ingestService: AdapterIngestService,
  ) {}

  async searchLinkedIn(query: string): Promise<LinkedInSearchResponse> {
    // The adapter expects page to be 1-based, though we only fetch one page synchronously here for the UI.
    const res = await this.linkedinAdapter.fetchPage({ query, page: 1 });

    // Extract the original LinkedInProfile payloads from the NormalizedProfiles
    // to match the frontend expectations and types.
    const profiles = res.profiles.map((p) => p.rawPayload as LinkedInProfile);

    return { success: true, data: profiles };
  }

  async ingestLinkedInProfile(profile: LinkedInProfile) {
    // We need to re-normalize it before saving
    // This is a bit redundant but ensures we use the adapter's logic
    const normalized = (this.linkedinAdapter as any).normalize(profile);
    return this.ingestService.saveSingleProfile(normalized, 'linkedin');
  }
}
