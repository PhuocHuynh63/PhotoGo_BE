import { PartialType } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ description: 'ID của vị trí', required: false })
  id?: string;
}