import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';

export interface ScheduleEventInput {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  attendeeEmails: string[];
  timeZone?: string;
}

export interface ScheduleEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly calendar: calendar_v3.Calendar | null;

  constructor(private readonly config: ConfigService) {
    const clientId = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = config.get<string>('GOOGLE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn(
        'Google Calendar credentials not configured — scheduling will be unavailable',
      );
      this.calendar = null;
      return;
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  get isConfigured(): boolean {
    return this.calendar !== null;
  }

  async scheduleEvent(input: ScheduleEventInput): Promise<ScheduleEventResult> {
    if (!this.calendar) {
      throw new Error(
        'Google Calendar not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN',
      );
    }

    const event: calendar_v3.Schema$Event = {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: input.startTime,
        timeZone: input.timeZone ?? 'Asia/Tashkent',
      },
      end: {
        dateTime: input.endTime,
        timeZone: input.timeZone ?? 'Asia/Tashkent',
      },
      attendees: input.attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `myhr-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const created = response.data;
    const meetLink =
      created.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri ?? null;

    this.logger.log(
      { eventId: created.id, meetLink },
      'Google Calendar event created',
    );

    return {
      eventId: created.id!,
      meetLink,
      htmlLink: created.htmlLink ?? null,
    };
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.calendar) return;
    await this.calendar.events
      .delete({ calendarId: 'primary', eventId })
      .catch(() => {});
  }
}
