import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { CandidatesService } from './candidates.service';

@Controller('api/v1/candidates')
@UseGuards(AuthGuard)
export class CandidatesController {
  constructor(private readonly svc: CandidatesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.svc.findAll(user.companyId, {
      search,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      sortBy: sortBy as 'score' | 'recent' | undefined,
    });
  }

  @Get(':id/outreach-history')
  getOutreachHistory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getOutreachHistory(user.companyId, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(user.companyId, id);
  }

  @Post(':id/resume')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadResume(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file field is required');
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are accepted');
    }
    return this.svc.uploadResume(
      user.companyId,
      id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }
}
