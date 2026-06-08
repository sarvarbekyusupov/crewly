import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

@Controller('api/v1/waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  join(@Body() dto: CreateWaitlistEntryDto) {
    return this.svc.join(dto);
  }
}
