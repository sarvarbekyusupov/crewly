import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, interval, merge } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { StaffGuard } from '../../common/guards/staff.guard';

@Controller('api/v1/staff-events')
@UseGuards(StaffGuard)
export class StaffEventsController {
  constructor(private readonly emitter: EventEmitter2) {}

  @Sse()
  stream(): Observable<MessageEvent> {
    const keepalive$ = interval(30_000).pipe(
      map((): MessageEvent => ({ data: '' })),
    );

    const events$ = fromEvent(this.emitter, 'staff.event').pipe(
      map(
        (event: any): MessageEvent => ({
          data: JSON.stringify({ type: event.type, payload: event.payload }),
        }),
      ),
    );

    return merge(events$, keepalive$);
  }
}
