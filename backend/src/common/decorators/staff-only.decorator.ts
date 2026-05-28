import { SetMetadata } from '@nestjs/common';

export const IS_STAFF_ONLY_KEY = 'isStaffOnly';
export const StaffOnly = () => SetMetadata(IS_STAFF_ONLY_KEY, true);
