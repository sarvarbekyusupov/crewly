import { applyDecorators, UseGuards } from '@nestjs/common';
import { StaffGuard } from '../guards/staff.guard';

export const StaffOnly = () => applyDecorators(UseGuards(StaffGuard));
