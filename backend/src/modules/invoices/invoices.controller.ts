import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InvoicesService } from './invoices.service';
import { z } from 'zod';

const MarkPaidSchema = z.object({
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

@Controller('api/v1/invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(
      user.companyId,
      status,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(user.companyId, id);
  }

  @Post(':id/pay')
  getPaymentLink(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getPaymentLink(user.companyId, id);
  }

  @Patch(':id/paid')
  markPaid(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(MarkPaidSchema))
    dto: z.infer<typeof MarkPaidSchema>,
  ) {
    return this.svc.markPaid(user.companyId, id, user.role, dto);
  }
}
