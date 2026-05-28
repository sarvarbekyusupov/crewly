import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';
import * as argon2 from 'argon2';
import type {
  CandidateSignupDto,
  CandidateLoginDto,
} from './dto/candidate-auth.dto';

interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class CandidateAuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private issueAccessToken(candidateId: string): string {
    return this.jwt.sign(
      { sub: candidateId, type: 'candidate_access' },
      { secret: this.config.get<string>('JWT_ACCESS_SECRET') },
    );
  }

  private async createRefreshToken(
    candidateId: string,
    ip?: string,
    ua?: string,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    await this.db.candidateSession.create({
      data: {
        candidateId,
        tokenHash,
        ipAddress: ip,
        userAgent: ua,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return rawToken;
  }

  async googleLogin(googleUser: GoogleUser, ip?: string, ua?: string) {
    let candidate = await this.db.candidate.findFirst({
      where: { googleId: googleUser.googleId, deletedAt: null },
    });

    if (!candidate && googleUser.email) {
      candidate = await this.db.candidate.findFirst({
        where: { email: googleUser.email, deletedAt: null },
      });
      if (candidate) {
        candidate = await this.db.candidate.update({
          where: { id: candidate.id },
          data: {
            googleId: googleUser.googleId,
            emailVerified: true,
            lastLoginAt: new Date(),
          },
        });
      }
    }

    if (!candidate) {
      candidate = await this.db.candidate.create({
        data: {
          googleId: googleUser.googleId,
          email: googleUser.email || undefined,
          fullName: googleUser.name || undefined,
          emailVerified: true,
          lastLoginAt: new Date(),
          consentStatus: 'explicit',
        },
      });
    } else {
      await this.db.candidate.update({
        where: { id: candidate.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const accessToken = this.issueAccessToken(candidate.id);
    const refreshToken = await this.createRefreshToken(candidate.id, ip, ua);

    const {
      rawResumeText: _,
      parsedResume: __,
      ...safeCandidate
    } = candidate as any;
    return { accessToken, refreshToken, candidate: safeCandidate };
  }

  async signup(dto: CandidateSignupDto, ip?: string, ua?: string) {
    const existing = await this.db.candidate.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const candidate = await this.db.candidate.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        emailVerified: false,
        consentStatus: 'explicit',
        lastLoginAt: new Date(),
      },
    });

    const accessToken = this.issueAccessToken(candidate.id);
    const refreshToken = await this.createRefreshToken(candidate.id, ip, ua);
    const {
      rawResumeText: _,
      parsedResume: __,
      passwordHash: ___,
      ...safeCandidate
    } = candidate as any;
    return { accessToken, refreshToken, candidate: safeCandidate };
  }

  async login(dto: CandidateLoginDto, ip?: string, ua?: string) {
    const candidate = await this.db.candidate.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!candidate || !(candidate as any).passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(
      (candidate as any).passwordHash,
      dto.password,
    );
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.db.candidate.update({
      where: { id: candidate.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.issueAccessToken(candidate.id);
    const refreshToken = await this.createRefreshToken(candidate.id, ip, ua);
    const {
      rawResumeText: _,
      parsedResume: __,
      passwordHash: ___,
      ...safeCandidate
    } = candidate as any;
    return { accessToken, refreshToken, candidate: safeCandidate };
  }

  async refreshTokens(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const session = await this.db.candidateSession.findUnique({
      where: { tokenHash },
      include: { candidate: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      if (session) {
        this.db.candidateSession
          .delete({ where: { id: session.id } })
          .catch(() => {});
      }
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    if (session.candidate.deletedAt) throw new UnauthorizedException();

    const newRawToken = randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newRawToken);

    await this.db.$transaction([
      this.db.candidateSession.delete({ where: { id: session.id } }),
      this.db.candidateSession.create({
        data: {
          candidateId: session.candidateId,
          tokenHash: newTokenHash,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const accessToken = this.issueAccessToken(session.candidateId);
    return { accessToken, refreshToken: newRawToken };
  }

  async logout(rawToken: string) {
    if (!rawToken) return;
    const tokenHash = this.hashToken(rawToken);
    await this.db.candidateSession.deleteMany({ where: { tokenHash } });
  }

  async getMe(candidateId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate || candidate.deletedAt) throw new NotFoundException();
    const { rawResumeText: _, parsedResume: __, ...safe } = candidate as any;
    return safe;
  }
}
