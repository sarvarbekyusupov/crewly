import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmModule } from '../llm/llm.module';
import { CoverLetterService } from './cover-letter.service';
import { HhApplyService } from './hh-apply.service';
import { LinkedInApplyService } from './linkedin-apply.service';

@Module({
  imports: [HttpModule, LlmModule],
  providers: [CoverLetterService, HhApplyService, LinkedInApplyService],
  exports: [CoverLetterService, HhApplyService, LinkedInApplyService],
})
export class ApplyModule {}
