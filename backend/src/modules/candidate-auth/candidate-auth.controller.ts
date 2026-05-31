import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CandidateAuthService } from './candidate-auth.service';
import { CandidateAuthGuard } from './guards/candidate-auth.guard';
import { CurrentCandidate } from '../../common/decorators/current-candidate.decorator';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CandidateSignupDto,
  CandidateSignupSchema,
  CandidateLoginDto,
  CandidateLoginSchema,
} from './dto/candidate-auth.dto';

const C_ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000,
};

const C_REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/candidate-auth/refresh',
};

@Controller('api/v1/candidate-auth')
export class CandidateAuthController {
  constructor(
    private readonly candidateAuthService: CandidateAuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @Public()
  @UseGuards(PassportAuthGuard('google'))
  googleAuth() {
    // Passport handles the redirect
  }

  @Get('google/callback')
  @Public()
  @UseGuards(PassportAuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as {
      googleId: string;
      email: string;
      name: string;
      picture: string;
    };
    const ip = req.ip;
    const ua = req.headers['user-agent'];

    const { accessToken, refreshToken } =
      await this.candidateAuthService.googleLogin(googleUser, ip, ua);

    res.cookie('c_access_token', accessToken, C_ACCESS_COOKIE_OPTS);
    res.cookie('c_refresh_token', refreshToken, C_REFRESH_COOKIE_OPTS);

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    res.redirect(`${frontendUrl}/candidate/dashboard`);
  }

  @Post('signup')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body(new ZodValidationPipe(CandidateSignupSchema)) dto: CandidateSignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, candidate } =
      await this.candidateAuthService.signup(
        dto,
        req.ip,
        req.headers['user-agent'],
      );
    res.cookie('c_access_token', accessToken, C_ACCESS_COOKIE_OPTS);
    res.cookie('c_refresh_token', refreshToken, C_REFRESH_COOKIE_OPTS);
    return { candidate };
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(CandidateLoginSchema)) dto: CandidateLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, candidate } =
      await this.candidateAuthService.login(
        dto,
        req.ip,
        req.headers['user-agent'],
      );
    res.cookie('c_access_token', accessToken, C_ACCESS_COOKIE_OPTS);
    res.cookie('c_refresh_token', refreshToken, C_REFRESH_COOKIE_OPTS);
    return { candidate };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.['c_refresh_token'];
    if (!rawToken) throw new UnauthorizedException();
    const { accessToken, refreshToken } =
      await this.candidateAuthService.refreshTokens(rawToken);
    res.cookie('c_access_token', accessToken, C_ACCESS_COOKIE_OPTS);
    res.cookie('c_refresh_token', refreshToken, C_REFRESH_COOKIE_OPTS);
    return { ok: true };
  }

  @Post('logout')
  @Public()
  @UseGuards(CandidateAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.['c_refresh_token'];
    await this.candidateAuthService.logout(rawToken);
    res.clearCookie('c_access_token');
    res.clearCookie('c_refresh_token', {
      path: '/api/v1/candidate-auth/refresh',
    });
    return { ok: true };
  }

  @Get('me')
  @Public()
  @UseGuards(CandidateAuthGuard)
  @SkipThrottle({ auth: true })
  async me(@CurrentCandidate() candidate: { id: string }) {
    return this.candidateAuthService.getMe(candidate.id);
  }
}
