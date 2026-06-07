import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

@Injectable()
export class WaitlistService {
  constructor(private readonly db: PrismaService) {}

  async join(dto: CreateWaitlistEntryDto): Promise<{ alreadyJoined: boolean }> {
    const existing = await this.db.waitlistEntry.findUnique({
      where: { email_role: { email: dto.email, role: dto.role } },
      select: { id: true },
    });

    if (existing) return { alreadyJoined: true };

    await this.db.waitlistEntry.create({
      data: { email: dto.email, role: dto.role },
    });

    return { alreadyJoined: false };
  }
}
