import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

// Define the response type for findAll
interface ReviewSummary {
  id: string;
  rating: number;
  comment: string;
  user: { fullName: string };
  vendor: { name: string };
}

@ApiTags('Reviews')
@Controller('reviews')
@ApiBearerAuth('access-token')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo đánh giá mới' })
  @ApiResponse({ status: 201, description: 'Đánh giá đã được tạo thành công', type: Review })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và hình ảnh của đánh giá',
    schema: {
      type: 'object',
      properties: {
        userId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của người dùng đánh giá'
        },
        rating: { 
          type: 'number', 
          example: 5,
          description: 'Điểm đánh giá (1-5)'
        },
        comment: { 
          type: 'string', 
          example: 'Dịch vụ rất tốt, nhân viên nhiệt tình',
          description: 'Nội dung đánh giá'
        },
        vendorId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của nhà cung cấp dịch vụ'
        },
        bookingId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của đơn đặt chỗ'
        },
        images: { 
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Danh sách hình ảnh đánh giá (tối đa 10 ảnh)'
        },
      },
      required: ['rating', 'vendorId', 'bookingId', 'userId'],
    },
  })
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<Review> {
    const fileMap = {
      images: files.images,
    };
    return this.reviewService.create(createReviewDto, fileMap);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả đánh giá' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả đánh giá', type: [Review] })
  async findAll(): Promise<ReviewSummary[]> {
    return this.reviewService.findAll();
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Lấy đánh giá theo ID nhà cung cấp' })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá cho ID nhà cung cấp đã cho', type: [Review] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá cho ID nhà cung cấp đã cho' })
  async findByVendorId(@Param('vendorId') vendorId: string): Promise<Review[]> {
    return this.reviewService.findByVendorId(vendorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được tìm thấy', type: Review })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  async findOne(@Param('id') id: string): Promise<Review> {
    return this.reviewService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được cập nhật thành công', type: Review })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dữ liệu và hình ảnh của đánh giá',
    schema: {
      type: 'object',
      properties: {
        rating: { 
          type: 'number', 
          example: 5,
          description: 'Điểm đánh giá (1-5)'
        },
        comment: { 
          type: 'string', 
          example: 'Dịch vụ rất tốt, nhân viên nhiệt tình',
          description: 'Nội dung đánh giá'
        },
        vendorId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của nhà cung cấp dịch vụ'
        },
        bookingId: { 
          type: 'string', 
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'ID của đơn đặt chỗ'
        },
        images: { 
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Danh sách hình ảnh đánh giá (tối đa 10 ảnh)'
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<Review> {
    const fileMap = {
      images: files.images,
    };
    return this.reviewService.update(id, updateReviewDto, fileMap);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.reviewService.remove(id);
  }
}