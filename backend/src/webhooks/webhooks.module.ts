import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ConversationsModule } from '../modules/conversations/conversations.module';
import { PaymeModule } from '../integrations/payme/payme.module';
import { HhModule } from '../integrations/hh/hh.module';

@Module({
  imports: [ConversationsModule, PaymeModule, HhModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
