import { Module } from '@nestjs/common';
import { HhModule } from '../../integrations/hh/hh.module';
import { HhEmployerController } from './hh-employer.controller';

@Module({
  imports: [HhModule],
  controllers: [HhEmployerController],
})
export class HhEmployerModule {}
