import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của nhà cung cấp',
    example: 'V001',
  })
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @ApiProperty({
    description: 'Tên đầy đủ của thành viên đội',
    example: 'Nguyễn Văn A',
  })
  full_name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    description: 'Vai trò của thành viên đội',
    example: 'Nhiếp ảnh gia',
  })
  role: string;

  @IsString()
  @Length(1, 20)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Số điện thoại của thành viên đội',
    example: '0123456789',
  })
  phone_number?: string;
}