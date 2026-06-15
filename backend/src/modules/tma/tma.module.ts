import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUES } from '../../workers/queue-names';
import { TmaService } from './tma.service';
import { TmaController } from './tma.controller';
import { TmaAuthGuard } from './guards/tma-auth.guard';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.AUTO_APPLY },
      { name: QUEUES.SEND_OUTREACH },
    ),
  ],
  providers: [TmaService, TmaAuthGuard],
  controllers: [TmaController],
})
export class TmaModule {}
