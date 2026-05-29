import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { ConsentService } from './consent.service';

@Controller('api/v1/candidates/:candidateId/consent')
@UseGuards(AuthGuard)
export class ConsentController {
  constructor(private readonly svc: ConsentService) {}

  @Get()
  findForCandidate(
    @CurrentUser() user: AuthUser,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ) {
    return this.svc.findForCandidate(user.companyId, candidateId);
  }
}
