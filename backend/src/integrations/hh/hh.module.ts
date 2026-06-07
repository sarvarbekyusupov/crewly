import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HhClientService } from './hh-client.service';
import { HhAdapter } from './hh.adapter';
import { HhJobsAdapter } from './hh-jobs.adapter';
import { HhTokenService } from './hh-token.service';
import { HhOAuthService } from './hh-oauth.service';
import { HhNegotiationsService } from './hh-negotiations.service';
import { HhVacancyService } from './hh-vacancy.service';
import { HhDictionaryService } from './hh-dictionary.service';
import { HhProfileSyncService } from './hh-profile-sync.service';
import { HhWebhookService } from './hh-webhook.service';
import { HhSuggestsService } from './hh-suggests.service';

const providers = [
  HhClientService,
  HhAdapter,
  HhJobsAdapter,
  HhTokenService,
  HhOAuthService,
  HhNegotiationsService,
  HhVacancyService,
  HhDictionaryService,
  HhProfileSyncService,
  HhWebhookService,
  HhSuggestsService,
];

@Module({
  imports: [HttpModule],
  providers,
  exports: providers,
})
export class HhModule {}
