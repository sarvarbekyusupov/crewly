import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle, ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LoginDto, LoginSchema, SignupDto, SignupSchema } from './dto/auth.dto';

const EmailBodySchema = z.object({ email: z.string().email() });
const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000,
};

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth/refresh',
};

@Controller('api/v1/auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async signup(@Body(new ZodValidationPipe(SignupSchema)) dto: SignupDto) {
    const { user, company } = await this.authService.signup(dto);
    return {
      message:
        'Account created. Please check your email to verify your account.',
      user: { id: user.id, email: user.email, role: user.role },
      company: { id: company.id, name: company.name },
    };
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip;
    const ua = req.headers['user-agent'];
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto,
      ip,
      ua,
    );
    res.cookie('hr_access_token', accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('hr_refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.['hr_refresh_token'];
    if (!rawToken) throw new UnauthorizedException();
    const { accessToken, refreshToken } =
      await this.authService.refreshTokens(rawToken);
    res.cookie('hr_access_token', accessToken, ACCESS_COOKIE_OPTS);
    res.cookie('hr_refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.['hr_refresh_token'];
    await this.authService.logout(rawToken);
    res.clearCookie('hr_access_token');
    res.clearCookie('hr_refresh_token', { path: '/api/v1/auth/refresh' });
    return { ok: true };
  }

  @Get('me')
  @SkipThrottle({ auth: true })
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Post('forgot-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(EmailBodySchema)) body: { email: string },
  ) {
    await this.authService.forgotPassword(body.email);
    return { ok: true };
  }

  @Post('reset-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema))
    body: {
      token: string;
      password: string;
    },
  ) {
    await this.authService.resetPassword(body.token, body.password);
    return { ok: true };
  }

  @Get('verify-email')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    if (!token) throw new BadRequestException('token required');
    await this.authService.verifyEmail(token);
    return { ok: true };
  }

  @Post('resend-verification')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body(new ZodValidationPipe(EmailBodySchema)) body: { email: string },
  ) {
    await this.authService.resendVerification(body.email);
    return { ok: true };
  }
}
