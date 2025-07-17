import { ApiProperty } from "@nestjs/swagger";
import { AlbumPaginationDto } from "./pagination.dto";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { AlbumStatus } from "src/constants/album.enum";

export class AlbumFilterDto extends AlbumPaginationDto {
  @ApiProperty({
    description: 'Ngày cần lấy album',
    required: true,
    example: '18/07/2025',
  })
  @IsString()
  date: string;

  @ApiProperty({
    description: 'Trạng thái album',
    required: false,
    enum: AlbumStatus,
  })
  @IsEnum(AlbumStatus)
  @IsOptional()
  albumStatus?: AlbumStatus;
}