import { IsUUID, IsOptional } from 'class-validator';

export class FindReviewDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  vendorId?: string;
}