import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { LinkedInAdapter } from './linkedin-client.service';
import { LinkedInJobsAdapter } from './linkedin-jobs.adapter';
import { LinkedInOAuthService } from './linkedin-oauth.service';

const providers = [LinkedInAdapter, LinkedInJobsAdapter, LinkedInOAuthService];

@Module({
  imports: [HttpModule, PrismaModule],
  providers,
  exports: providers,
})
export class LinkedInModule {}
