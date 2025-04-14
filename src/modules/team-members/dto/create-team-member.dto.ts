import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID of the vendor',
    example: 'V001',
  })
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @ApiProperty({
    description: 'Full name of the team member',
    example: 'Nguyễn Văn A',
  })
  full_name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @ApiProperty({
    description: 'Role of the team member',
    example: 'Nhiếp ảnh gia',
  })
  role: string;

  @IsString()
  @Length(1, 20)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Phone number of the team member',
    example: '0123456789',
  })
  phone_number?: string;
}