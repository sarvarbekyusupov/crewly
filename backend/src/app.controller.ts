import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/hh/callback')
  @Public()
  handleHhCallbackRedirect(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const params = new URLSearchParams(query).toString();
    return res.redirect(`/api/v1/candidate-portal/hh/callback?${params}`);
  }
}
