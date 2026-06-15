import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ConversationsModule } from '../modules/conversations/conversations.module';
import { PaymeModule } from '../integrations/payme/payme.module';
import { HhModule } from '../integrations/hh/hh.module';
import { LinkedInModule } from '../integrations/linkedin/linkedin.module';

@Module({
  imports: [ConversationsModule, PaymeModule, HhModule, LinkedInModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
