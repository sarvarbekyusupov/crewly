import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { QUEUES } from '../../workers/queue-names';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.ADVANCE_SCREENING })],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
