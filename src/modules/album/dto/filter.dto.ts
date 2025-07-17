import { ApiProperty } from "@nestjs/swagger";
import { AlbumPaginationDto } from "./pagination.dto";
import { IsEnum, IsOptional } from "class-validator";
import { AlbumStatus } from "src/constants/album.enum";

export class AlbumFilterDto extends AlbumPaginationDto {
  @ApiProperty({
    description: 'Trạng thái album',
    required: false,
    enum: AlbumStatus,
  })
  @IsEnum(AlbumStatus)
  @IsOptional()
  albumStatus?: AlbumStatus;
}