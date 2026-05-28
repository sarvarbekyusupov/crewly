import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { CandidateAuthController } from './candidate-auth.controller';
import { CandidateAuthService } from './candidate-auth.service';
import { CandidateAuthGuard } from './guards/candidate-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

describe('CandidateAuthController', () => {
  let controller: CandidateAuthController;
  let svc: {
    googleLogin: jest.Mock;
    signup: jest.Mock;
    login: jest.Mock;
    refreshTokens: jest.Mock;
    logout: jest.Mock;
    getMe: jest.Mock;
  };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    svc = {
      googleLogin: jest.fn(),
      signup: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
    };
    config = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateAuthController],
      providers: [
        { provide: CandidateAuthService, useValue: svc },
        { provide: ConfigService, useValue: config },
      ],
    })
      .overrideGuard(CandidateAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CandidateAuthController);
  });

  describe('signup', () => {
    it('sets cookies and returns candidate', async () => {
      svc.signup.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        candidate: { id: 'c1' },
      });
      const req = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.signup(
        { email: 'a@t.com', password: 'p', fullName: 'A' },
        req,
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'c_access_token',
        'access',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'c_refresh_token',
        'refresh',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ candidate: { id: 'c1' } });
    });
  });

  describe('login', () => {
    it('sets cookies and returns candidate', async () => {
      svc.login.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        candidate: { id: 'c1' },
      });
      const req = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.login(
        { email: 'a@t.com', password: 'p' },
        req,
        res,
      );

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ candidate: { id: 'c1' } });
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when no refresh cookie', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      await expect(controller.refresh(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates tokens and sets new cookies', async () => {
      svc.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      const req = {
        cookies: { c_refresh_token: 'old-refresh' },
      } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.refresh(req, res);

      expect(svc.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('logout', () => {
    it('clears cookies and calls service logout', async () => {
      svc.logout.mockResolvedValue(undefined);
      const req = {
        cookies: { c_refresh_token: 'refresh-token' },
      } as unknown as Request;
      const res = { clearCookie: jest.fn() } as unknown as Response;

      const result = await controller.logout(req, res);

      expect(svc.logout).toHaveBeenCalledWith('refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith('c_access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('c_refresh_token', {
        path: '/api/v1/candidate-auth/refresh',
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('me', () => {
    it('returns candidate profile', async () => {
      svc.getMe.mockResolvedValue({ id: 'c1', fullName: 'Alice' });
      const result = await controller.me({ id: 'c1' });
      expect(svc.getMe).toHaveBeenCalledWith('c1');
      expect(result).toEqual({ id: 'c1', fullName: 'Alice' });
    });
  });
});
