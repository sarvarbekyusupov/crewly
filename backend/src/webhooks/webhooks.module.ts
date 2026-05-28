import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ConversationsModule } from '../modules/conversations/conversations.module';
import { PaymeModule } from '../integrations/payme/payme.module';

@Module({
  imports: [ConversationsModule, PaymeModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
