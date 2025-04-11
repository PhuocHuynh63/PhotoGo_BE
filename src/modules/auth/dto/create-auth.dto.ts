import { IsNotEmpty, IsOptional, IsString, IsEmail, Length } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  otp?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  // @Length(6, 50, { message: 'Password must be between 6 and 50 characters' })
  passwordHash: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  auth?: string;
  // 'local' | 'google' | 'facebook' | 'github' | 'twitter' | 'linkedin' | 'apple';
}