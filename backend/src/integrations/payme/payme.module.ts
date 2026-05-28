import { Global, Module } from '@nestjs/common';
import { PaymeWebhookService } from './payme-webhook.service';
import { InvoicesModule } from '../../modules/invoices/invoices.module';

@Global()
@Module({
  imports: [InvoicesModule],
  providers: [PaymeWebhookService],
  exports: [PaymeWebhookService],
})
export class PaymeModule {}
