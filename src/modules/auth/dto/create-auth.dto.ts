import { IsNotEmpty, IsOptional, IsString, IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from 'src/constants/user.enum';

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
  avatarUrl?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  email: string;

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

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '0987654321',
    description: 'Phone number of the user',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  auth?: string;
}