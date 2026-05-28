import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

// Must be hoisted before the service import so the jest.mock is applied first
const mockEventsInsert = jest.fn();
const mockEventsDelete = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: mockEventsInsert,
        delete: mockEventsDelete,
      },
    }),
  },
}));

import { GoogleCalendarService } from './google-calendar.service';

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;

  const buildModule = async (envVars: Record<string, string | undefined>) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => envVars[key]),
          },
        },
      ],
    }).compile();
    return module.get(GoogleCalendarService);
  };

  const validEnv = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REFRESH_TOKEN: 'refresh-token',
  };

  const baseInput = {
    summary: 'Interview: Alice — Engineer',
    description: 'Application ID: app-1',
    startTime: '2026-06-01T10:00:00Z',
    endTime: '2026-06-01T11:00:00Z',
    attendeeEmails: ['alice@example.com', 'hr@acme.com'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('false when no env vars set', async () => {
      service = await buildModule({});
      expect(service.isConfigured).toBe(false);
    });

    it('false when only some vars set', async () => {
      service = await buildModule({ GOOGLE_CLIENT_ID: 'id' });
      expect(service.isConfigured).toBe(false);
    });

    it('true when all credentials present', async () => {
      service = await buildModule(validEnv);
      expect(service.isConfigured).toBe(true);
    });
  });

  describe('scheduleEvent()', () => {
    it('throws when not configured', async () => {
      service = await buildModule({});
      await expect(service.scheduleEvent(baseInput)).rejects.toThrow(
        'Google Calendar not configured',
      );
    });

    it('returns eventId, meetLink, htmlLink on success', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: {
          id: 'evt-123',
          htmlLink: 'https://calendar.google.com/event?id=evt-123',
          conferenceData: {
            entryPoints: [
              {
                entryPointType: 'video',
                uri: 'https://meet.google.com/abc-def-ghi',
              },
            ],
          },
        },
      });

      const result = await service.scheduleEvent(baseInput);

      expect(result.eventId).toBe('evt-123');
      expect(result.meetLink).toBe('https://meet.google.com/abc-def-ghi');
      expect(result.htmlLink).toBe(
        'https://calendar.google.com/event?id=evt-123',
      );
    });

    it('extracts Meet link from video entryPoint', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: {
          id: 'evt-1',
          htmlLink: null,
          conferenceData: {
            entryPoints: [
              { entryPointType: 'phone', uri: 'tel:+123' },
              { entryPointType: 'video', uri: 'https://meet.google.com/xyz' },
            ],
          },
        },
      });

      const result = await service.scheduleEvent(baseInput);

      expect(result.meetLink).toBe('https://meet.google.com/xyz');
    });

    it('meetLink is null when no video entryPoint', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: {
          id: 'evt-1',
          htmlLink: null,
          conferenceData: {
            entryPoints: [{ entryPointType: 'phone', uri: 'tel:+123' }],
          },
        },
      });

      const result = await service.scheduleEvent(baseInput);

      expect(result.meetLink).toBeNull();
    });

    it('meetLink is null when no conferenceData', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: { id: 'evt-1', htmlLink: null, conferenceData: null },
      });

      const result = await service.scheduleEvent(baseInput);

      expect(result.meetLink).toBeNull();
    });

    it('passes all attendees to calendar API', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: { id: 'evt-1', htmlLink: null, conferenceData: null },
      });

      await service.scheduleEvent(baseInput);

      const call = mockEventsInsert.mock.calls[0][0];
      const attendees = call.requestBody.attendees.map((a: any) => a.email);
      expect(attendees).toContain('alice@example.com');
      expect(attendees).toContain('hr@acme.com');
    });

    it('defaults timeZone to Asia/Tashkent when not specified', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: { id: 'evt-1', htmlLink: null, conferenceData: null },
      });

      await service.scheduleEvent(baseInput);

      const call = mockEventsInsert.mock.calls[0][0];
      expect(call.requestBody.start.timeZone).toBe('Asia/Tashkent');
      expect(call.requestBody.end.timeZone).toBe('Asia/Tashkent');
    });

    it('uses provided timeZone when specified', async () => {
      service = await buildModule(validEnv);
      mockEventsInsert.mockResolvedValue({
        data: { id: 'evt-1', htmlLink: null, conferenceData: null },
      });

      await service.scheduleEvent({ ...baseInput, timeZone: 'Europe/London' });

      const call = mockEventsInsert.mock.calls[0][0];
      expect(call.requestBody.start.timeZone).toBe('Europe/London');
    });
  });

  describe('deleteEvent()', () => {
    it('no-op when not configured', async () => {
      service = await buildModule({});
      await expect(service.deleteEvent('evt-1')).resolves.toBeUndefined();
      expect(mockEventsDelete).not.toHaveBeenCalled();
    });

    it('calls calendar API when configured', async () => {
      service = await buildModule(validEnv);
      mockEventsDelete.mockResolvedValue({});

      await service.deleteEvent('evt-1');

      expect(mockEventsDelete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'evt-1',
      });
    });

    it('swallows errors from API', async () => {
      service = await buildModule(validEnv);
      mockEventsDelete.mockRejectedValue(new Error('API error'));

      await expect(service.deleteEvent('evt-1')).resolves.toBeUndefined();
    });
  });
});
