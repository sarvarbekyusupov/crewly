import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LinkedInAdapter } from './linkedin-client.service';
import { LinkedInJobsAdapter } from './linkedin-jobs.adapter';

@Module({
  imports: [HttpModule],
  providers: [LinkedInAdapter, LinkedInJobsAdapter],
  exports: [LinkedInAdapter, LinkedInJobsAdapter],
})
export class LinkedInModule {}
