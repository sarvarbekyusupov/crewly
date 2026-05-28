import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { StaffOrAdminGuard } from '../../common/guards/staff-or-admin.guard';
import { SourcingService } from './sourcing.service';

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
  ingestLinkedIn(@Body() profile: any) {
    return this.svc.ingestLinkedInProfile(profile);
  }
}
