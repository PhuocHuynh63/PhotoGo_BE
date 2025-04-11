import { IsNotEmpty, IsOptional, IsString, IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  fullName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL of the user',
    required: false,
  })
  avatarUrl?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  email: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '123456',
    description: 'OTP for email verification',
    required: false,
  })
  otp?: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Length(6, 50)
  @ApiProperty({
    example: 'password123',
    description: 'Password for the user',
    minLength: 6,
    maxLength: 50,
  })
  passwordHash: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @ApiProperty({
    example: '0987654321',
    description: 'Phone number of the user',
  })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '12345',
    description: 'Role ID of the user',
    required: false,
  })
  roleId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'active',
    description: 'Status of the user (e.g., active, inactive)',
    required: false,
  })
  status?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'local',
    description: 'Authentication method (e.g., local, google, facebook)',
    required: false,
  })
  auth?: string;
}