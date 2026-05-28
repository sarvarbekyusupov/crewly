import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { StaffEventsController } from './staff-events.controller';

@Module({
  controllers: [EventsController, StaffEventsController],
})
export class EventsModule {}
