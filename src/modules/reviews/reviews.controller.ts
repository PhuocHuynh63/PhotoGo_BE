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
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ status: 201, description: 'Review created successfully', type: Review })
  async create(@Body() createReviewDto: CreateReviewDto): Promise<Review> {
    return this.reviewService.create(createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiResponse({ status: 200, description: 'List of all reviews', type: [Review] })
  async findAll(): Promise<ReviewSummary[]> {
    return this.reviewService.findAll();
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get reviews by vendor ID' })
  @ApiResponse({ status: 200, description: 'List of reviews for the given vendor ID', type: [Review] })
  @ApiResponse({ status: 404, description: 'No reviews found for the given vendor ID' })
  async findByVendorId(@Param('vendorId') vendorId: string): Promise<Review[]> {
    return this.reviewService.findByVendorId(vendorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiResponse({ status: 200, description: 'Review found', type: Review })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async findOne(@Param('id') id: string): Promise<Review> {
    return this.reviewService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a review by ID' })
  @ApiResponse({ status: 200, description: 'Review updated successfully', type: Review })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto): Promise<Review> {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review by ID' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.reviewService.remove(id);
  }
}