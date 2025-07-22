import { IsNotEmpty, IsOptional, IsString, IsEmail, Length, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoles, UserRolesId, UserStatus } from 'src/constants/user.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/role.entity';

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
    required: false
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


export class CreateAuthForAdminDto {
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của người dùng',
  })
  email: string;

  @IsString()
  @Length(6, 50)
  @ApiProperty({
    example: 'password123',
    description: 'Password for the user',
    minLength: 6,
    maxLength: 50,
  })
  password: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Tên đầy đủ của người dùng',
    required: false,
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'local',
    enum: ['local', 'facebook', 'google'],
    description: 'Phương thức xác thực (local, google, facebook, ...)',
    required: false,
  })
  auth?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'R002',
    enum: UserRolesId,
    description: 'ID vai trò của người dùng',
    required: false,
  })
  roleId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'URL avatar',
    required: false,
  })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'ACTIVE',
    enum: UserStatus,
    description: 'Trạng thái user',
    required: false,
  })
  status?: string;
}


