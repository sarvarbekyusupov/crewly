import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { RequireRole } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PlacementsService } from './placements.service';
import {
  RecordSeparationSchema,
  RecordSeparationDto,
} from './dto/placement.dto';

@Controller('api/v1/placements')
@UseGuards(AuthGuard, CompanyRoleGuard)
export class PlacementsController {
  constructor(private readonly svc: PlacementsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(
      user.companyId,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(user.companyId, id);
  }

  @Post(':id/separation')
  @RequireRole('hiring_manager')
  recordSeparation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RecordSeparationSchema))
    body: RecordSeparationDto,
  ) {
    return this.svc.recordSeparation(user.companyId, id, body);
  }
}
