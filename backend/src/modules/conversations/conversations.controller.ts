import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/roles.decorator';
import { ConversationsService } from './conversations.service';

@Controller('api/v1/conversations')
@UseGuards(AuthGuard, CompanyRoleGuard)
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('applicationId') applicationId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(
      user.companyId,
      applicationId,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.findOne(user.companyId, id);
  }

  @Post(':id/messages')
  @RequireRole('hiring_manager')
  sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.svc.sendRecruiterMessage(user.companyId, id, content);
  }
}
