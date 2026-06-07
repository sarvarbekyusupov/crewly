import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email/email.service';
import { ConfigService } from '@nestjs/config';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let db: any;
  let email: { sendInvite: jest.Mock };
  let config: { get: jest.Mock };

  const companyId = 'company-1';
  const userId = 'user-1';

  beforeEach(async () => {
    db = {
      company: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      authToken: {
        create: jest.fn().mockResolvedValue({}),
      },
      session: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: any[]) => Promise.all(ops)),
    };
    email = { sendInvite: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: db },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(CompaniesService);
  });

  describe('getMe', () => {
    it('returns company when found', async () => {
      const company = { id: companyId, name: 'Acme' };
      db.company.findUnique.mockResolvedValue(company);

      const result = await service.getMe(companyId);
      expect(result).toEqual(company);
    });

    it('throws NotFoundException when company not found', async () => {
      db.company.findUnique.mockResolvedValue(null);
      await expect(service.getMe(companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMe', () => {
    it('delegates to db.company.update', async () => {
      const updated = { id: companyId, name: 'NewName' };
      db.company.update.mockResolvedValue(updated);

      const result = await service.updateMe(companyId, { name: 'NewName' });
      expect(db.company.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: { name: 'NewName' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('getUsers', () => {
    it('returns non-deleted users', async () => {
      const users = [{ id: userId, email: 'a@test.com', role: 'admin' }];
      db.user.findMany.mockResolvedValue(users);

      const result = await service.getUsers(companyId);
      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId, deletedAt: null },
        }),
      );
      expect(result).toEqual(users);
    });
  });

  describe('inviteUser', () => {
    const dto = {
      email: 'new@test.com',
      fullName: 'New User',
      role: 'admin' as const,
    };

    it('throws ConflictException when user already in same company', async () => {
      db.user.findFirst.mockResolvedValue({ id: userId, companyId });
      await expect(service.inviteUser(companyId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when email registered in another company', async () => {
      db.user.findFirst.mockResolvedValue({
        id: userId,
        companyId: 'other-company',
      });
      await expect(service.inviteUser(companyId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates user, authToken and fires invite email', async () => {
      db.user.findFirst.mockResolvedValue(null);
      db.company.findUnique.mockResolvedValue({ name: 'Acme' });
      const createdUser = {
        id: 'new-user',
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
      };
      db.user.create.mockResolvedValue(createdUser);
      db.authToken.create.mockResolvedValue({});

      const result = await service.inviteUser(companyId, dto);

      expect(db.user.create).toHaveBeenCalled();
      expect(db.authToken.create).toHaveBeenCalled();
      expect(result).toEqual(createdUser);
    });
  });

  describe('removeUser', () => {
    it('throws NotFoundException when user not found', async () => {
      db.user.findFirst.mockResolvedValue(null);
      await expect(service.removeUser(companyId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when removing owner', async () => {
      db.user.findFirst.mockResolvedValue({
        id: userId,
        companyId,
        role: 'owner',
      });
      await expect(service.removeUser(companyId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('soft-deletes non-owner user', async () => {
      db.user.findFirst.mockResolvedValue({
        id: userId,
        companyId,
        role: 'admin',
      });
      db.user.update.mockResolvedValue({ id: userId, deletedAt: new Date() });

      const result = await service.removeUser(companyId, userId);
      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      expect(result).toBeDefined();
    });
  });
});
