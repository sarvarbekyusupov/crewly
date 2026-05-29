import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsController } from './events.controller';
import { AuthGuard } from '../../common/guards/auth.guard';
import { of } from 'rxjs';

describe('EventsController', () => {
  let controller: EventsController;
  let emitter: any;

  beforeEach(async () => {
    emitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventEmitter2, useValue: emitter }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EventsController);
  });

  it('stream returns an Observable', () => {
    const user = { id: 'user-1', companyId: 'co-1', role: 'admin' as const };
    const stream = controller.stream(user);
    expect(stream).toBeDefined();
    expect(typeof stream.subscribe).toBe('function');
  });

  it('stream emits company events matching companyId', (done) => {
    const user = { id: 'user-1', companyId: 'co-1', role: 'admin' as const };
    const stream = controller.stream(user);

    const received: any[] = [];
    const sub = stream.subscribe({
      next: (event) => {
        received.push(event);
        if (received.length === 1) {
          sub.unsubscribe();
          const parsed = JSON.parse(received[0].data);
          expect(parsed.type).toBe('new_message');
          done();
        }
      },
    });

    emitter.emit('company.event', {
      type: 'new_message',
      companyId: 'co-1',
      payload: {},
    });
  });

  it('stream does not emit events for different companyId', (done) => {
    const user = { id: 'user-1', companyId: 'co-1', role: 'admin' as const };
    const stream = controller.stream(user);
    let count = 0;

    const sub = stream.subscribe({ next: () => count++ });
    emitter.emit('company.event', {
      type: 'new_message',
      companyId: 'co-other',
      payload: {},
    });

    setTimeout(() => {
      sub.unsubscribe();
      expect(count).toBe(0);
      done();
    }, 50);
  });
});
