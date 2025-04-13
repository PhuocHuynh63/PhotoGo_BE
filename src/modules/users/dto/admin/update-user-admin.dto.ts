import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserForAdminDto {
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @Length(6, 50)
  @ApiProperty({
    example: 'newpassword123',
    description: 'New password for the user (plain text)',
    minLength: 6,
    maxLength: 50,
  })
  password?: string; // Mật khẩu chưa mã hóa

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user',
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '0986056438',
    description: 'User phone number',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'URL of the user avatar',
  })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'active',
    description: 'Status of the user (e.g., active, inactive)',
  })
  status?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Unrank',
    description: 'Rank of the user (e.g., Unrank, Bronze, Silver)',
  })
  rank?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'local',
    description: 'Authentication method (e.g., local, google, facebook)',
  })
  auth?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '2',
    description: 'Role ID of the user',
  })
  roleId?: string;
}