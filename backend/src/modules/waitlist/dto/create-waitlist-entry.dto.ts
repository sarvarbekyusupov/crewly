import { IsEmail, IsIn } from 'class-validator';

export class CreateWaitlistEntryDto {
  @IsEmail()
  email: string;

  @IsIn(['employer', 'candidate'])
  role: 'employer' | 'candidate';
}
