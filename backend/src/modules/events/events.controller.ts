import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/events')
@UseGuards(AuthGuard)
export class EventsController {
  constructor(private readonly emitter: EventEmitter2) {}

  @Sse()
  stream(@CurrentUser() user: any): Observable<MessageEvent> {
    const companyId: string = user.companyId;

    const keepalive$ = interval(30_000).pipe(
      map((): MessageEvent => ({ data: '' })),
    );

    const events$ = fromEvent(this.emitter, 'company.event').pipe(
      filter((event: any) => event?.companyId === companyId),
      map(
        (event: any): MessageEvent => ({
          data: JSON.stringify({ type: event.type, payload: event.payload }),
        }),
      ),
    );

    return merge(events$, keepalive$);
  }
}
