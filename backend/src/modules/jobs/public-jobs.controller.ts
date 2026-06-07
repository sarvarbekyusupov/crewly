import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/public/jobs')
@Public()
export class PublicJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll() {
    return this.jobsService.findAllPublic();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOnePublic(id);
  }
}
