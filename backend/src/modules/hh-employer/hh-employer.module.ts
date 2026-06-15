import { Module } from '@nestjs/common';
import { HhModule } from '../../integrations/hh/hh.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { HhEmployerController } from './hh-employer.controller';

@Module({
  imports: [HhModule, PrismaModule],
  controllers: [HhEmployerController],
})
export class HhEmployerModule {}
