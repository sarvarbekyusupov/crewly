import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email/email.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { hashToken, generateRawToken, REFRESH_TOKEN_TTL_MS } from '../../common/utils/token.utils';
import { DUMMY_HASH } from '../../common/auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private issueAccessToken(user: {
    id: string;
    companyId: string;
    role: string;
  }): string {
    return this.jwt.sign(
      {
        sub: user.id,
        companyId: user.companyId,
        role: user.role,
        type: 'access',
      },
      { secret: this.config.get<string>('JWT_ACCESS_SECRET') },
    );
  }

  private async createRefreshToken(
    userId: string,
    ip?: string,
    ua?: string,
  ): Promise<string> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    await this.db.session.create({
      data: {
        userId,
        tokenHash,
        ipAddress: ip,
        userAgent: ua,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    return rawToken;
  }

  async signup(dto: SignupDto) {
    const existing = await this.db.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);

    const company = await this.db.company.create({
      data: {
        name: dto.companyName,
        contactEmail: dto.contactEmail,
      },
    });

    const user = await this.db.user.create({
      data: {
        companyId: company.id,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: 'owner',
      },
    });

    const verifyToken = generateRawToken();
    const verifyTokenHash = hashToken(verifyToken);
    await this.db.authToken.create({
      data: {
        userId: user.id,
        tokenHash: verifyTokenHash,
        type: 'email_verify',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    this.email
      .sendEmailVerification(
        user.email,
        `${frontendUrl}/verify-email?token=${verifyToken}`,
      )
      .catch((e) => this.logger.error({ err: e.message }, 'Background task error'));

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, company };
  }

  async login(dto: LoginDto, ip?: string, ua?: string) {
    const user = await this.db.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: { company: true },
    });

    const hashToVerify = user?.passwordHash ?? DUMMY_HASH;
    const valid = await argon2.verify(hashToVerify, dto.password).catch(() => false);
    if (!user || !user.passwordHash || !valid)
      throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const accessToken = this.issueAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, ip, ua);

    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  async refreshTokens(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const session = await this.db.session.findUnique({
      where: { tokenHash },
      include: { user: { include: { company: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      if (session) {
        this.db.session.delete({ where: { id: session.id } }).catch((e) => this.logger.error({ err: e.message }, 'Session cleanup failed'));
      }
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    if (session.user.deletedAt) throw new UnauthorizedException();

    const newRawToken = generateRawToken();
    const newTokenHash = hashToken(newRawToken);

    await this.db.$transaction([
      this.db.session.delete({ where: { id: session.id } }),
      this.db.session.create({
        data: {
          userId: session.userId,
          tokenHash: newTokenHash,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    const accessToken = this.issueAccessToken(session.user);
    return { accessToken, refreshToken: newRawToken };
  }

  async logout(rawToken: string) {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    await this.db.session.deleteMany({ where: { tokenHash } });
  }

  async getMe(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
    if (!user) return null;
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async forgotPassword(email: string) {
    const user = await this.db.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) return;

    await this.db.authToken.updateMany({
      where: { userId: user.id, type: 'password_reset', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateRawToken();
    const tokenHash = hashToken(token);
    await this.db.authToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    this.email
      .sendPasswordReset(email, `${frontendUrl}/reset-password?token=${token}`)
      .catch((e) => this.logger.error({ err: e.message }, 'Background task error'));
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const record = await this.db.authToken.findUnique({ where: { tokenHash } });

    if (
      !record ||
      !['password_reset', 'invite'].includes(record.type) ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.db.$transaction([
      this.db.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          ...(record.type === 'invite' ? { emailVerified: true } : {}),
        },
      }),
      this.db.authToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.db.session.deleteMany({ where: { userId: record.userId } }),
    ]);
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const record = await this.db.authToken.findUnique({ where: { tokenHash } });

    if (
      !record ||
      record.type !== 'email_verify' ||
      record.usedAt ||
      record.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.db.$transaction([
      this.db.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.db.authToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async resendVerification(email: string) {
    const user = await this.db.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user || user.emailVerified) return;

    await this.db.authToken.updateMany({
      where: { userId: user.id, type: 'email_verify', usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateRawToken();
    const tokenHash = hashToken(token);
    await this.db.authToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'email_verify',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    this.email
      .sendEmailVerification(
        email,
        `${frontendUrl}/verify-email?token=${token}`,
      )
      .catch((e) => this.logger.error({ err: e.message }, 'Background task error'));
  }
}
