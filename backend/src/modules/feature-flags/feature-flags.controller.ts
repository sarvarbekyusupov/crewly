import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StaffGuard } from '../../common/guards/staff.guard';
import {
  FeatureFlagsService,
  UpsertFeatureFlagSchema,
  UpsertFeatureFlagDto,
} from './feature-flags.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('api/v1/staff/feature-flags')
@UseGuards(StaffGuard)
export class FeatureFlagsController {
  constructor(private readonly svc: FeatureFlagsService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  upsert(
    @Body(new ZodValidationPipe(UpsertFeatureFlagSchema))
    dto: UpsertFeatureFlagDto,
  ) {
    return this.svc.upsert(dto);
  }

  @Delete(':name')
  delete(@Param('name') name: string) {
    return this.svc.delete(name);
  }
}
