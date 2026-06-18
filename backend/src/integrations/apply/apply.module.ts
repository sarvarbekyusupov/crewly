import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmModule } from '../llm/llm.module';
import { CoverLetterService } from './cover-letter.service';
import { LinkedInApplyService } from './linkedin-apply.service';
import { ApplyKitService } from './apply-kit.service';

@Module({
  imports: [HttpModule, LlmModule],
  providers: [CoverLetterService, LinkedInApplyService, ApplyKitService],
  exports: [CoverLetterService, LinkedInApplyService, ApplyKitService],
})
export class ApplyModule {}
