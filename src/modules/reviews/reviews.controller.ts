import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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
  async create(@Body() createReviewDto: CreateReviewDto): Promise<Review> {
    return this.reviewService.create(createReviewDto);
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
  async update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto): Promise<Review> {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.reviewService.remove(id);
  }
}