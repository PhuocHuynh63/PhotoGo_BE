import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFiles, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilterReviewDto, SortField, SortDirection } from './dto/filter-review.dto';
import { Review } from './entities/review.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ResponseMessage } from 'src/decorator/custom';
import { Public } from 'src/decorator/custom';

// Define the response type for findAll
interface ReviewSummary {
  id: string;
  rating: number;
  comment: string;
  user: { fullName: string };
  vendor: { name: string };
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('Reviews')
@Controller('reviews')
@ApiBearerAuth('access-token')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  @Post()
  @ApiOperation({ summary: 'Tạo đánh giá mới' })
  @ApiResponse({ status: 201, description: 'Đánh giá đã được tạo thành công', type: Review })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng hoặc nhà cung cấp' })
  @ApiResponse({ status: 409, description: 'Đã tồn tại đánh giá cho đơn đặt chỗ này' })
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
  @ResponseMessage('Tạo đánh giá thành công')
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<Review> {
    try {
      if (!createReviewDto.userId || !createReviewDto.bookingId || !createReviewDto.vendorId) {
        throw new HttpException('Thiếu thông tin bắt buộc', HttpStatus.BAD_REQUEST);
      }
      if (!createReviewDto.rating || createReviewDto.rating < 1 || createReviewDto.rating > 5) {
        throw new HttpException('Điểm đánh giá phải từ 1 đến 5', HttpStatus.BAD_REQUEST);
      }
      const fileMap = {
        images: files?.images,
      };
      return await this.reviewService.create(createReviewDto, fileMap);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo đánh giá', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả đánh giá' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng item trên mỗi trang' })
  @ApiQuery({ 
    name: 'rating', 
    required: false, 
    type: Number, 
    description: 'Lọc theo điểm đánh giá (1-5)',
    enum: [1, 2, 3, 4, 5]
  })
  @ApiQuery({ 
    name: 'sortField', 
    required: false, 
    enum: SortField,
    description: 'Sắp xếp theo: createdAt, rating'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách tất cả đánh giá',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Review' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Lấy danh sách đánh giá thành công')
  async findAll(@Query() filterDto: FilterReviewDto): Promise<PaginatedResponse<ReviewSummary>> {
    try {
      // Validate filterDto
      if (filterDto.rating && (filterDto.rating < 1 || filterDto.rating > 5)) {
        throw new HttpException('Điểm đánh giá phải từ 1 đến 5', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.page && filterDto.page < 1) {
        throw new HttpException('Số trang phải lớn hơn 0', HttpStatus.BAD_REQUEST);
      }

      if (filterDto.limit && filterDto.limit < 1) {
        throw new HttpException('Số lượng item trên mỗi trang phải lớn hơn 0', HttpStatus.BAD_REQUEST);
      }

      return await this.reviewService.findAll(filterDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Log the error for debugging
      console.error('Error in findAll reviews:', error);
      
      // Check if it's a database connection error
      if (error.message && error.message.includes('databaseName')) {
        throw new HttpException('Lỗi kết nối cơ sở dữ liệu', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      throw new HttpException(
        'Lỗi khi lấy danh sách đánh giá: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('vendor/:vendorId')
  @Public()
  @ApiOperation({ summary: 'Lấy đánh giá theo ID nhà cung cấp' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng item trên mỗi trang' })
  @ApiQuery({ 
    name: 'rating', 
    required: false, 
    type: Number, 
    description: 'Lọc theo điểm đánh giá (1-5)',
    enum: [1, 2, 3, 4, 5]
  })
  @ApiQuery({ 
    name: 'sortField', 
    required: false, 
    enum: SortField,
    description: 'Sắp xếp theo: createdAt, rating'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách đánh giá cho ID nhà cung cấp đã cho',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Review' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'ID nhà cung cấp không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá cho ID nhà cung cấp đã cho' })
  @ResponseMessage('Lấy danh sách đánh giá của nhà cung cấp thành công')
  async findByVendorId(
    @Param('vendorId') vendorId: string,
    @Query() filterDto: FilterReviewDto,
  ): Promise<PaginatedResponse<Review>> {
    if (!vendorId) {
      throw new HttpException('ID nhà cung cấp không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.reviewService.findByVendorId(vendorId, filterDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy đánh giá của nhà cung cấp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được tìm thấy', type: Review })
  @ApiResponse({ status: 400, description: 'ID đánh giá không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  @ResponseMessage('Lấy thông tin đánh giá thành công')
  async findOne(@Param('id') id: string): Promise<Review> {
    if (!id) {
      throw new HttpException('ID đánh giá không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.reviewService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy thông tin đánh giá', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được cập nhật thành công', type: Review })
  @ApiResponse({ status: 400, description: 'Dữ liệu cập nhật không hợp lệ' })
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
  @ResponseMessage('Cập nhật đánh giá thành công')
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<Review> {
    if (!id) {
      throw new HttpException('ID đánh giá không được để trống', HttpStatus.BAD_REQUEST);
    }
    if (updateReviewDto.rating && (updateReviewDto.rating < 1 || updateReviewDto.rating > 5)) {
      throw new HttpException('Điểm đánh giá phải từ 1 đến 5', HttpStatus.BAD_REQUEST);
    }
    try {
      const fileMap = {
        images: files?.images,
      };
      return await this.reviewService.update(id, updateReviewDto, fileMap);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi cập nhật đánh giá', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đánh giá theo ID' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được xóa thành công' })
  @ApiResponse({ status: 400, description: 'ID đánh giá không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá' })
  @ResponseMessage('Xóa đánh giá thành công')
  async remove(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new HttpException('ID đánh giá không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      await this.reviewService.remove(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xóa đánh giá', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}