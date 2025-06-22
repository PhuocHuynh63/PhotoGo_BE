import { IsNotEmpty, IsOptional, IsString, IsEmail, Length, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoles, UserRolesId, UserStatus } from 'src/constants/user.enum';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
    required: true,
  })
  fullName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    format: 'binary',
    description: 'Avatar URL of the user',
  })
  avatarUrl?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
    required: true,
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
    required: true,
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
  @IsEnum(UserRolesId)
  @ApiProperty({
    example: "R001",
    description: 'Role ID of the user',
    enum: UserRolesId,
    required: false,
  })
  roleId?: UserRolesId;

  @IsOptional()
  @IsEnum(UserStatus)
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'Status of the user',
    required: false,
  })
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'local',
    description: 'Authentication method used by the user',
    required: false,
  })
  auth?: string;
}