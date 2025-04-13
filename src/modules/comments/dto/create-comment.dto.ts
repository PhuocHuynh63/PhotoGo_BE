import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  images?: any;
}