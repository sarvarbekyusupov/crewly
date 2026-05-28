import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StaffGuard } from '../../common/guards/staff.guard';
import { StaffOnly } from '../../common/decorators/staff-only.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LlmCallsService } from './llm-calls.service';

@Controller('api/v1/llm-calls')
@StaffOnly()
@Public()
@UseGuards(StaffGuard)
export class LlmCallsController {
  constructor(private readonly svc: LlmCallsService) {}

  @Get()
  findAll(
    @Query('purpose') purpose?: string,
    @Query('model') model?: string,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({
      purpose,
      model,
      companyId,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('summary')
  summary() {
    return this.svc.summary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }
}
