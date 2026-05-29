import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email/email.service';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  size: z.enum(['1-10', '11-50', '51-200', '200+']).optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

export const InviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(200),
  role: z.enum(['admin', 'hiring_manager', 'viewer']),
});

export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>;
export type InviteUserDto = z.infer<typeof InviteUserSchema>;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async getMe(companyId: string) {
    const company = await this.db.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async updateMe(companyId: string, dto: UpdateCompanyDto) {
    return this.db.company.update({ where: { id: companyId }, data: dto });
  }

  async getUsers(companyId: string) {
    return this.db.user.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteUser(companyId: string, dto: InviteUserDto) {
    const existing = await this.db.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) {
      if (existing.companyId === companyId) {
        throw new ConflictException('User already in this company');
      }
      throw new ConflictException('Email already registered');
    }

    const company = await this.db.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    const user = await this.db.user.create({
      data: {
        companyId,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        emailVerified: false,
      },
      select: { id: true, email: true, fullName: true, role: true },
    });

    // Generate a password-reset token that doubles as the invite setup link
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.db.authToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'invite',
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    this.email
      .sendInvite(
        user.email,
        user.fullName,
        `${frontendUrl}/reset-password?token=${token}`,
        company?.name ?? 'MyHR',
      )
      .catch(() => {});

    return user;
  }

  async removeUser(companyId: string, userId: string) {
    const user = await this.db.user.findFirst({
      where: { id: userId, companyId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'owner')
      throw new ForbiddenException('Cannot remove company owner');

    const [updated] = await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      }),
      this.db.session.deleteMany({ where: { userId } }),
    ]);
    return updated;
  }
}
