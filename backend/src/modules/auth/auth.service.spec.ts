import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email/email.service';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let db: any;
  let email: { sendEmailVerification: jest.Mock; sendPasswordReset: jest.Mock };

  beforeEach(async () => {
    db = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      company: { create: jest.fn() },
      authToken: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    email = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: db },
        { provide: EmailService, useValue: email },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3001') },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signup', () => {
    it('rejects duplicate email', async () => {
      db.user.findFirst.mockResolvedValue({ id: 'u1' });
      await expect(
        service.signup({
          email: 'a@test.com',
          password: 'password123',
          fullName: 'A',
          companyName: 'Co',
          contactEmail: 'a@test.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates company and user', async () => {
      db.user.findFirst.mockResolvedValue(null);
      db.company.create.mockResolvedValue({ id: 'c1', name: 'Co' });
      db.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        companyId: 'c1',
        fullName: 'A',
        role: 'owner',
        passwordHash: 'hash',
      });
      db.authToken.create.mockResolvedValue({});

      const result = await service.signup({
        email: 'a@test.com',
        password: 'password123',
        fullName: 'A',
        companyName: 'Co',
        contactEmail: 'a@test.com',
      });

      expect(result.company.id).toBe('c1');
      expect(db.authToken.create).toHaveBeenCalled();
      expect(email.sendEmailVerification).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('rejects unverified email', async () => {
      const hash = await argon2.hash('password123');
      db.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        passwordHash: hash,
        emailVerified: false,
        company: {},
      });

      await expect(
        service.login({ email: 'a@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns session token for verified user', async () => {
      const hash = await argon2.hash('password123');
      db.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@test.com',
        passwordHash: hash,
        emailVerified: true,
        company: { id: 'c1' },
      });
      db.session.create.mockResolvedValue({});
      db.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'a@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toHaveLength(64);
      expect(db.session.create).toHaveBeenCalled();
    });

    it('throws when user not found', async () => {
      db.user.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@x.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('throws when session not found', async () => {
      db.session.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when session revoked', async () => {
      db.session.findUnique.mockResolvedValue({
        id: 's-1',
        userId: 'u-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
        user: { deletedAt: null },
      });
      db.session.delete.mockResolvedValue({});
      await expect(service.refreshTokens('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates tokens on valid session', async () => {
      db.session.findUnique.mockResolvedValue({
        id: 's-1',
        userId: 'u-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 10000),
        ipAddress: null,
        userAgent: null,
        user: { id: 'u-1', companyId: 'c-1', role: 'owner', deletedAt: null },
      });
      db.session.delete.mockResolvedValue({});
      db.session.create.mockResolvedValue({});

      const result = await service.refreshTokens('valid-token');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toHaveLength(64);
    });
  });

  describe('logout', () => {
    it('deletes session', async () => {
      db.session.deleteMany.mockResolvedValue({});
      await service.logout('raw-token');
      expect(db.session.deleteMany).toHaveBeenCalled();
    });

    it('noop when no token', async () => {
      await service.logout('');
      expect(db.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('returns user without passwordHash', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'u-1',
        passwordHash: 'hash',
        company: {},
      });
      const result = await service.getMe('u-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when user not found', async () => {
      db.user.findUnique.mockResolvedValue(null);
      const result = await service.getMe('u-1');
      expect(result).toBeNull();
    });
  });

  describe('forgotPassword', () => {
    it('returns early when email not found', async () => {
      db.user.findFirst.mockResolvedValue(null);
      await service.forgotPassword('x@x.com');
      expect(db.authToken.create).not.toHaveBeenCalled();
    });

    it('creates reset token and sends email', async () => {
      db.user.findFirst.mockResolvedValue({ id: 'u-1', email: 'u@x.com' });
      db.authToken.updateMany.mockResolvedValue({});
      db.authToken.create.mockResolvedValue({});

      await service.forgotPassword('u@x.com');
      expect(db.authToken.create).toHaveBeenCalled();
      expect(email.sendPasswordReset).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('throws on invalid/expired token', async () => {
      db.authToken.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword('bad-token', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('resets password and invalidates sessions', async () => {
      db.authToken.findUnique.mockResolvedValue({
        id: 'at-1',
        userId: 'u-1',
        type: 'password_reset',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      db.user.update.mockResolvedValue({});
      db.authToken.update.mockResolvedValue({});
      db.session.deleteMany.mockResolvedValue({});

      await service.resetPassword('valid-token', 'newpassword');
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('throws on invalid token', async () => {
      db.authToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks email as verified', async () => {
      db.authToken.findUnique.mockResolvedValue({
        id: 'at-1',
        userId: 'u-1',
        type: 'email_verify',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      db.user.update.mockResolvedValue({});
      db.authToken.update.mockResolvedValue({});

      await service.verifyEmail('valid-token');
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('returns early when user not found', async () => {
      db.user.findFirst.mockResolvedValue(null);
      await service.resendVerification('x@x.com');
      expect(db.authToken.create).not.toHaveBeenCalled();
    });

    it('returns early when already verified', async () => {
      db.user.findFirst.mockResolvedValue({ id: 'u-1', emailVerified: true });
      await service.resendVerification('u@x.com');
      expect(db.authToken.create).not.toHaveBeenCalled();
    });

    it('creates new verification token', async () => {
      db.user.findFirst.mockResolvedValue({
        id: 'u-1',
        email: 'u@x.com',
        emailVerified: false,
      });
      db.authToken.updateMany.mockResolvedValue({});
      db.authToken.create.mockResolvedValue({});

      await service.resendVerification('u@x.com');
      expect(db.authToken.create).toHaveBeenCalled();
    });
  });
});
