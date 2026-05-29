import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { ScreeningsService } from './screenings.service';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class ScreeningsController {
  constructor(private readonly svc: ScreeningsService) {}

  @Get('applications/:applicationId/screenings')
  findByApplication(
    @CurrentUser() user: AuthUser,
    @Param('applicationId', ParseUUIDPipe) appId: string,
  ) {
    return this.svc.findByApplication(appId, user.companyId);
  }

  @Post('applications/:applicationId/screenings')
  create(@CurrentUser() user: AuthUser, @Param('applicationId', ParseUUIDPipe) appId: string) {
    return this.svc.create(appId, user.companyId);
  }

  @Get('screenings/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id, user.companyId);
  }

  @Post('screenings/:id/escalate')
  escalate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ) {
    return this.svc.escalate(id, user.companyId, body.reason);
  }
}
