import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    signup: jest.Mock;
    login: jest.Mock;
    logout: jest.Mock;
    refreshTokens: jest.Mock;
    getMe: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
    verifyEmail: jest.Mock;
    resendVerification: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      signup: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshTokens: jest.fn(),
      getMe: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should create an account and return user/company data', async () => {
      const mockResult = {
        user: { id: '1', email: 'test@example.com', role: 'owner' },
        company: { id: 'c1', name: 'Test Co' },
      };
      authService.signup.mockResolvedValue(mockResult);

      const dto = {
        email: 'test@example.com',
        password: 'password',
        fullName: 'Test User',
        companyName: 'Test Co',
        contactEmail: 'contact@example.com',
      };
      const result = await controller.signup(dto);

      expect(authService.signup).toHaveBeenCalledWith(dto);
      expect(result.message).toContain('Account created');
      expect(result.user).toEqual(mockResult.user);
      expect(result.company).toEqual(mockResult.company);
    });
  });

  describe('login', () => {
    it('should login and set JWT cookies', async () => {
      const mockResult = {
        accessToken: 'access-jwt',
        refreshToken: 'refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'owner',
          companyId: 'c1',
        },
      };
      authService.login.mockResolvedValue(mockResult);

      const req = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;
      const dto = { email: 'test@example.com', password: 'password' };

      const result = await controller.login(dto, req, res);

      expect(authService.login).toHaveBeenCalledWith(dto, req.ip, 'jest');
      expect(res.cookie).toHaveBeenCalledWith(
        'hr_access_token',
        'access-jwt',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'hr_refresh_token',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth/refresh',
        }),
      );
      expect(result.user).toEqual(mockResult.user);
    });
  });

  describe('logout', () => {
    it('should clear cookies and logout from service if refresh token exists', async () => {
      const req = {
        cookies: { hr_refresh_token: 'refresh-token' },
      } as unknown as Request;
      const res = { clearCookie: jest.fn() } as unknown as Response;

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith('hr_access_token');
      expect(res.clearCookie).toHaveBeenCalledWith('hr_refresh_token', {
        path: '/api/v1/auth/refresh',
      });
      expect(result).toEqual({ ok: true });
    });

    it('should clear cookies even if no refresh token provided', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = { clearCookie: jest.fn() } as unknown as Response;

      const result = await controller.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(res.clearCookie).toHaveBeenCalledWith('hr_access_token');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('me', () => {
    it('should return current user details', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      authService.getMe.mockResolvedValue(mockUser);

      const result = await controller.me({ id: '1', companyId: 'c1', role: 'owner' as const });
      expect(authService.getMe).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when no refresh cookie', async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;
      const { UnauthorizedException } = await import('@nestjs/common');
      await expect(controller.refresh(req, res)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates tokens and sets new cookies', async () => {
      authService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      const req = {
        cookies: { hr_refresh_token: 'old-refresh' },
      } as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      const result = await controller.refresh(req, res);
      expect(authService.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'hr_access_token',
        'new-access',
        expect.anything(),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'hr_refresh_token',
        'new-refresh',
        expect.anything(),
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('forgotPassword', () => {
    it('calls service and returns ok', async () => {
      authService.forgotPassword.mockResolvedValue(undefined);
      const result = await controller.forgotPassword({
        email: 'user@example.com',
      });
      expect(authService.forgotPassword).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('resetPassword', () => {
    it('calls service and returns ok', async () => {
      authService.resetPassword.mockResolvedValue(undefined);
      const result = await controller.resetPassword({
        token: 'tok',
        password: 'newpass',
      });
      expect(authService.resetPassword).toHaveBeenCalledWith('tok', 'newpass');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when no token', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      await expect(controller.verifyEmail('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('calls service and returns ok', async () => {
      authService.verifyEmail.mockResolvedValue(undefined);
      const result = await controller.verifyEmail('verify-tok');
      expect(authService.verifyEmail).toHaveBeenCalledWith('verify-tok');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('resendVerification', () => {
    it('calls service and returns ok', async () => {
      authService.resendVerification.mockResolvedValue(undefined);
      const result = await controller.resendVerification({
        email: 'u@example.com',
      });
      expect(authService.resendVerification).toHaveBeenCalledWith(
        'u@example.com',
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
