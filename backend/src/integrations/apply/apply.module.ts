import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmModule } from '../llm/llm.module';
import { CoverLetterService } from './cover-letter.service';
import { LinkedInApplyService } from './linkedin-apply.service';

@Module({
  imports: [HttpModule, LlmModule],
  providers: [CoverLetterService, LinkedInApplyService],
  exports: [CoverLetterService, LinkedInApplyService],
})
export class ApplyModule {}
