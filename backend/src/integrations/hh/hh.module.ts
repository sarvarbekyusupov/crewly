import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HhClientService } from './hh-client.service';
import { HhAdapter } from './hh.adapter';
import { HhJobsAdapter } from './hh-jobs.adapter';
import { HhNegotiationsService } from './hh-negotiations.service';
import { HhVacancyService } from './hh-vacancy.service';
import { HhDictionaryService } from './hh-dictionary.service';
import { HhWebhookService } from './hh-webhook.service';
import { HhSuggestsService } from './hh-suggests.service';

const providers = [
  HhClientService,
  HhAdapter,
  HhJobsAdapter,
  HhNegotiationsService,
  HhVacancyService,
  HhDictionaryService,
  HhWebhookService,
  HhSuggestsService,
];

@Module({
  imports: [HttpModule],
  providers,
  exports: providers,
})
export class HhModule {}
