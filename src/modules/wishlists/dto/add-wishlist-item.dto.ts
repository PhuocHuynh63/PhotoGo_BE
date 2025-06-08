import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddWishlistItemDto {
  @ApiProperty({
    description: 'ID của danh sách mong muốn',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  wishlistId: string;

  @ApiProperty({
    description: 'ID của dịch vụ concept',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  @IsNotEmpty()
  serviceConceptId: string;
}