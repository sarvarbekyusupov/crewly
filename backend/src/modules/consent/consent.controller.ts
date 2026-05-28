import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsentService } from './consent.service';

@Controller('api/v1/candidates/:candidateId/consent')
@UseGuards(AuthGuard)
export class ConsentController {
  constructor(private readonly svc: ConsentService) {}

  @Get()
  findForCandidate(
    @CurrentUser() user: any,
    @Param('candidateId') candidateId: string,
  ) {
    return this.svc.findForCandidate(user.companyId, candidateId);
  }
}
