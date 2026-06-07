import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { StaffOrAdminGuard } from '../../common/guards/staff-or-admin.guard';
import { SourcingService } from './sourcing.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('api/v1/sourcing')
@UseGuards(StaffOrAdminGuard)
export class SourcingController {
  constructor(private readonly svc: SourcingService) {}

  @Get('linkedin')
  searchLinkedIn(@Query('q') q: string) {
    if (!q) {
      return { data: [] };
    }
    return this.svc.searchLinkedIn(q);
  }

  @Post('linkedin/ingest')
  ingestLinkedIn(
    @Body(
      new ZodValidationPipe(
        z
          .object({
            linkedin_url: z.string().url().optional(),
            full_name: z.string().optional(),
            email: z.string().email().optional(),
          })
          .passthrough(),
      ),
    )
    profile: Record<string, unknown>,
  ) {
    return this.svc.ingestLinkedInProfile(profile);
  }
}
