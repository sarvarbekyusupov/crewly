import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleCalendarService } from '../../integrations/google-calendar/google-calendar.service';
import { ScheduleInterviewDto } from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly db: PrismaService,
    private readonly gcal: GoogleCalendarService,
  ) {}

  async scheduleInterview(
    companyId: string,
    applicationId: string,
    dto: ScheduleInterviewDto,
    userId?: string,
  ) {
    const app = await this.db.application.findUnique({
      where: { id: applicationId },
      select: { companyId: true, candidateId: true, jobId: true },
    });

    if (!app || app.companyId !== companyId) {
      throw new NotFoundException('Application not found');
    }

    const candidate = await this.db.candidate.findUnique({
      where: { id: app.candidateId },
      select: { fullName: true, email: true },
    });

    const job = await this.db.job.findUnique({
      where: { id: app.jobId },
      select: { title: true },
    });

    const attendees = [
      ...new Set([
        ...dto.attendeeEmails,
        ...(candidate?.email ? [candidate.email] : []),
      ]),
    ];

    const result = await this.gcal.scheduleEvent({
      summary: `Interview: ${candidate?.fullName ?? 'Candidate'} — ${job?.title ?? 'Position'}`,
      description: `Application ID: ${applicationId}\nScheduled via myHR`,
      startTime: dto.startTime,
      endTime: dto.endTime,
      attendeeEmails: attendees,
      timeZone: dto.timeZone,
    });

    const updated = await this.db.application.update({
      where: { id: applicationId },
      data: {
        status: 'interview_scheduled',
        googleCalendarEventId: result.eventId,
        googleMeetLink: result.meetLink,
        interviewScheduledAt: new Date(dto.startTime),
        interviewedAt: new Date(),
      } as any,
    });

    if (userId) {
      await this.db.auditLog
        .create({
          data: {
            actorType: 'user',
            actorId: userId,
            action: 'application.interview_scheduled',
            resourceType: 'application',
            resourceId: applicationId,
            companyId,
          },
        })
        .catch((e) => console.error('Background task error:', e));
    }

    return {
      ...updated,
      meetLink: result.meetLink,
      calendarLink: result.htmlLink,
    };
  }
}
