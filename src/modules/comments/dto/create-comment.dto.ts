import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của người dùng',
    example: '97004449-52d9-4a49-b071-ce5786f7645e',
  })
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID của vendor',
    example: '10be10e3-5ab5-4c88-9a99-23d7032d15c1',
  })
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nội dung bình luận',
    example: 'Bình luận của người dùng',
  })
  content: string;

  @IsOptional()
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: 'Danh sách ảnh đính kèm',
    example: ['image1.jpg', 'image2.jpg'],
  })
  images?: any;
}