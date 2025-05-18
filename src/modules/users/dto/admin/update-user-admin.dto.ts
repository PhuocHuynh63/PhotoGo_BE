import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRank, UserStatus } from 'src/constants/user.enum';

export class UpdateUserForAdminDto {
  @IsOptional()
  @IsEmail()
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của người dùng',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @Length(6, 50)
  @ApiProperty({
    example: 'newpassword123',
    description: 'Mật khẩu mới cho người dùng (văn bản thuần)',
    minLength: 6,
    maxLength: 50,
  })
  password?: string; // Mật khẩu chưa mã hóa

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'John Doe',
    description: 'Tên đầy đủ của người dùng',
  })
  fullName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '0986056438',
    description: 'Số điện thoại của người dùng',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'URL của hình ảnh người dùng',
  })
  avatarUrl?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: UserStatus.ACTIVE,
    description: 'Trạng thái của người dùng (hoạt động, không hoạt động)',
  })
  status?: string;

  @IsEnum(UserRank)
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: UserRank.UNRANK,
    description: 'Vai trò của người dùng (ví dụ: Unrank, Bronze, Silver)',
  })
  rank?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'local',
    description: 'Phương thức xác thực (ví dụ: local, google, facebook)',
  })
  auth?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '2',
    description: 'ID vai trò của người dùng',
  })
  roleId?: string;
}