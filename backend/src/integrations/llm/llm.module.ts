import { Global, Module } from '@nestjs/common';
import { PromptRunnerService } from './prompt-runner.service';
import { CostCalculatorService } from './cost-calculator.service';

@Global()
@Module({
  providers: [PromptRunnerService, CostCalculatorService],
  exports: [PromptRunnerService, CostCalculatorService],
})
export class LlmModule {}
