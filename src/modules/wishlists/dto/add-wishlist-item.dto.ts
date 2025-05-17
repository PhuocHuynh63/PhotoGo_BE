import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddWishlistItemDto {
  @IsUUID()
  @IsNotEmpty()
  wishlistId: string;

  @IsUUID()
  @IsNotEmpty()
  serviceConceptId: string;
}