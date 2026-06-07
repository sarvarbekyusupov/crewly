import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

@Controller('api/v1/waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  join(@Body() dto: CreateWaitlistEntryDto) {
    return this.svc.join(dto);
  }
}
