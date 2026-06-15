import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { HhClientService } from './hh-client.service';
import { HhAdapter } from './hh.adapter';
import { HhJobsAdapter } from './hh-jobs.adapter';
import { HhNegotiationsService } from './hh-negotiations.service';
import { HhVacancyService } from './hh-vacancy.service';
import { HhDictionaryService } from './hh-dictionary.service';
import { HhWebhookService } from './hh-webhook.service';
import { HhSuggestsService } from './hh-suggests.service';
import { HhOAuthService } from './hh-oauth.service';
import { HhResumeService } from './hh-resume.service';
import { HhApplicantService } from './hh-applicant.service';
import { HhCandidateService } from './hh-candidate.service';
import { HhChatService } from './hh-chat.service';
import { HhCommentsService } from './hh-comments.service';
import { HhSalaryService } from './hh-salary.service';

const providers = [
  HhClientService,
  HhAdapter,
  HhJobsAdapter,
  HhNegotiationsService,
  HhVacancyService,
  HhDictionaryService,
  HhWebhookService,
  HhSuggestsService,
  HhOAuthService,
  HhResumeService,
  HhApplicantService,
  HhCandidateService,
  HhChatService,
  HhCommentsService,
  HhSalaryService,
];

@Module({
  imports: [HttpModule, PrismaModule],
  providers,
  exports: providers,
})
export class HhModule {}
