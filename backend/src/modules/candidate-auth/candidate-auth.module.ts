import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CandidateAuthController } from './candidate-auth.controller';
import { CandidateAuthService } from './candidate-auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { CandidateAuthGuard } from './guards/candidate-auth.guard';

@Module({
  imports: [PassportModule],
  controllers: [CandidateAuthController],
  providers: [CandidateAuthService, GoogleStrategy, CandidateAuthGuard],
  exports: [CandidateAuthService, CandidateAuthGuard],
})
export class CandidateAuthModule {}
