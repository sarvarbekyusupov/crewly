import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import * as path from 'path';
import { AppConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { JwtCoreModule } from './common/jwt-core.module';
import { AuthGuard } from './common/guards/auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { LlmModule } from './integrations/llm/llm.module';
import { EmailModule } from './integrations/email/email.module';
import { SmsModule } from './integrations/sms/sms.module';
import { StorageModule } from './integrations/storage/storage.module';
import { GoogleCalendarModule } from './integrations/google-calendar/google-calendar.module';
import { TelegramModule } from './integrations/telegram/telegram.module';
import { HhModule } from './integrations/hh/hh.module';
import { LinkedInModule } from './integrations/linkedin/linkedin.module';
import { AuthModule } from './modules/auth/auth.module';
import { StaffAuthModule } from './modules/staff-auth/staff-auth.module';
import { CandidateAuthModule } from './modules/candidate-auth/candidate-auth.module';
import { CandidatePortalModule } from './modules/candidate-portal/candidate-portal.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { ScreeningsModule } from './modules/screenings/screenings.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { PlacementsModule } from './modules/placements/placements.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { LlmCallsModule } from './modules/llm-calls/llm-calls.module';
import { ConsentModule } from './modules/consent/consent.module';
import { EventsModule } from './modules/events/events.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { AgentsModule } from './modules/agents/agents.module';
import { SourcingModule } from './modules/sourcing/sourcing.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { HhEmployerModule } from './modules/hh-employer/hh-employer.module';
import { WorkersModule } from './workers/workers.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TmaModule } from './modules/tma/tma.module';
import { HealthController } from './common/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { QUEUES } from './workers/queue-names';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 5 },
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.' }),
    AppConfigModule,
    CommonModule,
    JwtCoreModule,
    PrismaModule,
    LlmModule,
    EmailModule,
    SmsModule,
    StorageModule,
    GoogleCalendarModule,
    TelegramModule,
    HhModule,
    LinkedInModule,

    I18nModule.forRoot({
      fallbackLanguage: 'ru',
      loaderOptions: {
        path: path.join(__dirname, '../../i18n/'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL'),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 86400 * 7 },
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUES.CLEANUP }),

    AuthModule,
    StaffAuthModule,
    CandidateAuthModule,
    CandidatePortalModule,
    CompaniesModule,
    JobsModule,
    ApplicationsModule,
    CandidatesModule,
    ScreeningsModule,
    ConversationsModule,
    PlacementsModule,
    InvoicesModule,
    LlmCallsModule,
    ConsentModule,
    EventsModule,
    DashboardModule,
    AnalyticsModule,
    SchedulingModule,
    FeatureFlagsModule,
    AgentsModule,
    SourcingModule,
    WaitlistModule,
    HhEmployerModule,
    TmaModule,
    WorkersModule,
    WebhooksModule,
  ],
  controllers: [HealthController, AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
