import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CandidateAuthService } from './candidate-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

describe('CandidateAuthService', () => {
  let service: CandidateAuthService;
  let db: any;
  let jwt: { sign: jest.Mock };
  let config: { get: jest.Mock };

  const candidateId = 'candidate-1';

  beforeEach(async () => {
    db = {
      candidate: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      candidateSession: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((arr: unknown[]) => Promise.all(arr)),
    };
    jwt = { sign: jest.fn().mockReturnValue('mock-access-token') };
    config = { get: jest.fn().mockReturnValue('secret') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateAuthService,
        { provide: PrismaService, useValue: db },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(CandidateAuthService);
  });

  describe('signup', () => {
    it('throws ConflictException for duplicate email', async () => {
      db.candidate.findFirst.mockResolvedValue({ id: candidateId });
      await expect(
        service.signup({
          email: 'a@test.com',
          password: 'pass',
          fullName: 'Alice',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates candidate and returns tokens', async () => {
      db.candidate.findFirst.mockResolvedValue(null);
      db.candidate.create.mockResolvedValue({
        id: candidateId,
        email: 'a@test.com',
        fullName: 'Alice',
        passwordHash: 'hash',
      });
      db.candidateSession.create.mockResolvedValue({});

      const result = await service.signup({
        email: 'a@test.com',
        password: 'pass123',
        fullName: 'Alice',
      });

      expect(db.candidate.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toHaveLength(64);
      expect(result.candidate).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when candidate not found', async () => {
      db.candidate.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ email: 'a@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when candidate has no password (OAuth only)', async () => {
      db.candidate.findFirst.mockResolvedValue({
        id: candidateId,
        passwordHash: null,
      });
      await expect(
        service.login({ email: 'a@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await argon2.hash('correct-pass');
      db.candidate.findFirst.mockResolvedValue({
        id: candidateId,
        passwordHash: hash,
      });
      await expect(
        service.login({ email: 'a@test.com', password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid credentials', async () => {
      const hash = await argon2.hash('pass123');
      db.candidate.findFirst.mockResolvedValue({
        id: candidateId,
        email: 'a@test.com',
        passwordHash: hash,
        fullName: 'Alice',
      });
      db.candidate.update.mockResolvedValue({});
      db.candidateSession.create.mockResolvedValue({});

      const result = await service.login({
        email: 'a@test.com',
        password: 'pass123',
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toHaveLength(64);
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException when session not found', async () => {
      db.candidateSession.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when session is expired', async () => {
      db.candidateSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        candidate: { deletedAt: null },
        candidateId,
      });
      await expect(service.refreshTokens('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when candidate is deleted', async () => {
      db.candidateSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        candidate: { deletedAt: new Date() },
        candidateId,
      });
      await expect(service.refreshTokens('some-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates tokens on valid session', async () => {
      db.candidateSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        candidate: { deletedAt: null },
        candidateId,
        ipAddress: null,
        userAgent: null,
      });
      db.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.refreshTokens('valid-raw-token');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toHaveLength(64);
    });
  });

  describe('logout', () => {
    it('does nothing when no token provided', async () => {
      await service.logout('');
      expect(db.candidateSession.deleteMany).not.toHaveBeenCalled();
    });

    it('revokes session when token provided', async () => {
      await service.logout('some-raw-token');
      expect(db.candidateSession.deleteMany).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('throws NotFoundException when candidate not found', async () => {
      db.candidate.findUnique.mockResolvedValue(null);
      await expect(service.getMe(candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when candidate is deleted', async () => {
      db.candidate.findUnique.mockResolvedValue({
        id: candidateId,
        deletedAt: new Date(),
      });
      await expect(service.getMe(candidateId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns candidate without sensitive fields', async () => {
      db.candidate.findUnique.mockResolvedValue({
        id: candidateId,
        fullName: 'Alice',
        deletedAt: null,
        rawResumeText: 'raw',
        parsedResume: {},
      });

      const result = await service.getMe(candidateId);
      expect(result).not.toHaveProperty('rawResumeText');
      expect(result).not.toHaveProperty('parsedResume');
      expect(result.fullName).toBe('Alice');
    });
  });

  describe('googleLogin', () => {
    const googleUser = {
      googleId: 'g-123',
      email: 'google@test.com',
      name: 'Google User',
      picture: 'https://pic.url',
    };

    it('creates new candidate when not found', async () => {
      db.candidate.findFirst.mockResolvedValue(null);
      db.candidate.create.mockResolvedValue({
        id: candidateId,
        googleId: 'g-123',
        email: googleUser.email,
      });
      db.candidate.update.mockResolvedValue({});
      db.candidateSession.create.mockResolvedValue({});

      const result = await service.googleLogin(googleUser);
      expect(db.candidate.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('links googleId to existing candidate with same email', async () => {
      const existing = {
        id: candidateId,
        email: googleUser.email,
        googleId: null,
      };
      db.candidate.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      db.candidate.update.mockResolvedValue({ ...existing, googleId: 'g-123' });
      db.candidateSession.create.mockResolvedValue({});

      await service.googleLogin(googleUser);
      expect(db.candidate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ googleId: googleUser.googleId }),
        }),
      );
    });
  });
});
