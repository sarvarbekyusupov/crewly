import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { RequireRole } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CompaniesService,
  InviteUserDto,
  InviteUserSchema,
  UpdateCompanyDto,
  UpdateCompanySchema,
} from './companies.service';

@Controller('api/v1/companies')
@UseGuards(AuthGuard, CompanyRoleGuard)
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.svc.getMe(user.companyId);
  }

  @Patch('me')
  @RequireRole('admin')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UpdateCompanySchema)) dto: UpdateCompanyDto,
  ) {
    return this.svc.updateMe(user.companyId, dto);
  }

  @Get('me/users')
  getUsers(@CurrentUser() user: AuthUser) {
    return this.svc.getUsers(user.companyId);
  }

  @Post('me/users')
  @RequireRole('admin')
  inviteUser(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(InviteUserSchema)) dto: InviteUserDto,
  ) {
    return this.svc.inviteUser(user.companyId, dto);
  }

  @Delete('me/users/:id')
  @RequireRole('admin')
  removeUser(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.removeUser(user.companyId, id);
  }
}
