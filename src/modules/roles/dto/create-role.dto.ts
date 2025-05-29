import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'R001', description: 'Mã quyền' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  id: string;

  @ApiProperty({ example: 'Administrator', description: 'Tên quyền' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  name: string;

  @ApiProperty({ example: 'Full system access', description: 'Mô tả quyền', required: false })
  @IsString()
  @IsOptional()
  description?: string;
} 