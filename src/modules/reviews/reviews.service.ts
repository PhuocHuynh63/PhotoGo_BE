import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewImage } from './entities/review_image.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilterReviewDto, SortField, SortDirection } from './dto/filter-review.dto';
import { isUUID } from 'class-validator';
import { UploadService } from '../../3rdService/upload/upload.service';

// Define the return type for findAll
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

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewImage)
    private readonly reviewImageRepository: Repository<ReviewImage>,
    private readonly uploadService: UploadService,
  ) { }

  async create(createReviewDto: CreateReviewDto, files: { images?: Express.Multer.File[] }): Promise<Review> {
    // Validate required fields
    if (!createReviewDto.userId || !createReviewDto.bookingId || !createReviewDto.vendorId) {
      throw new BadRequestException('userId, bookingId và vendorId là bắt buộc');
    }

    // Validate UUIDs
    if (!isUUID(createReviewDto.userId)) {
      throw new BadRequestException('Định dạng userId không hợp lệ');
    }
    if (!isUUID(createReviewDto.bookingId)) {
      throw new BadRequestException('Định dạng bookingId không hợp lệ');
    }
    if (!isUUID(createReviewDto.vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    // Validate rating
    if (!createReviewDto.rating || createReviewDto.rating < 1 || createReviewDto.rating > 5) {
      throw new BadRequestException('Điểm đánh giá phải từ 1 đến 5');
    }

    // Check if review already exists for this booking
    const existingReview = await this.reviewRepository.findOne({
      where: { bookingId: createReviewDto.bookingId }
    });
    if (existingReview) {
      throw new ConflictException('Đã tồn tại đánh giá cho đơn đặt chỗ này');
    }

    try {
      const review = this.reviewRepository.create(createReviewDto);
      const savedReview = await this.reviewRepository.save(review);

      // Upload images if provided
      if (files?.images?.length) {
        if (files.images.length > 10) {
          throw new BadRequestException('Số lượng hình ảnh không được vượt quá 10');
        }

        const imageUrls = await this.uploadService.uploadImages(files.images, 'reviews');

        // Create review images
        const reviewImages = imageUrls.map(url =>
          this.reviewImageRepository.create({
            reviewId: savedReview.id,
            imageUrl: url,
          })
        );
        await this.reviewImageRepository.save(reviewImages);
      }

      return this.findOne(savedReview.id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Không thể tạo đánh giá: ' + error.message);
    }
  }

  async findAll(filterDto: FilterReviewDto): Promise<PaginatedResponse<ReviewSummary>> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        rating, 
        sortField = SortField.CREATED_AT,
        sortDirection = SortDirection.DESC 
      } = filterDto;
      const skip = (page - 1) * limit;

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.vendor', 'vendor')
        .select([
          'review.id',
          'review.rating',
          'review.comment',
          'review.createdAt',
          'user.id',
          'user.email',
          'user.fullName',
          'user.phoneNumber',
          'user.avatarUrl',
          'user.status',
          'user.rank',
          'user.note',
          'user.auth',
          'user.lastLoginAt',
          'user.createdAt',
          'user.updatedAt',
          'vendor.id',
          'vendor.name',
        ]);

      // Apply rating filter if provided
      if (rating !== undefined && rating !== null) {
        queryBuilder.andWhere('review.rating = :rating', { rating });
      }

      // Apply sorting
      queryBuilder.orderBy(`review.${sortField}`, sortDirection === SortDirection.ASC ? 'ASC' : 'DESC');

      const [reviews, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data: reviews,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new BadRequestException('Không thể lấy danh sách đánh giá: ' + error.message);
    }
  }

  async findByVendorId(vendorId: string, filterDto: FilterReviewDto): Promise<PaginatedResponse<Review>> {
    if (!isUUID(vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    try {
      const { 
        page = 1, 
        limit = 10, 
        rating, 
        sortField = SortField.CREATED_AT,
        sortDirection = SortDirection.DESC 
      } = filterDto;
      const skip = (page - 1) * limit;

      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.vendor', 'vendor')
        .leftJoinAndSelect('review.images', 'images')
        .where('review.vendorId = :vendorId', { vendorId })
        .select([
          'review',
          'user.id',
          'user.email',
          'user.fullName',
          'user.phoneNumber',
          'user.avatarUrl',
          'user.status',
          'user.rank',
          'user.note',
          'user.auth',
          'user.lastLoginAt',
          'user.createdAt',
          'user.updatedAt',
          'vendor',
          'images'
        ]);

      // Apply rating filter if provided
      if (rating) {
        queryBuilder.andWhere('review.rating = :rating', { rating });
      }

      // Apply sorting
      queryBuilder.orderBy(`review.${sortField}`, sortDirection === SortDirection.ASC ? 'ASC' : 'DESC');

      const [reviews, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      if (total === 0) {
        throw new NotFoundException(`Không tìm thấy đánh giá cho vendor ID: ${vendorId}`);
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data: reviews,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể lấy đánh giá: ' + error.message);
    }
  }

  async findOne(id: string): Promise<Review> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID đánh giá không hợp lệ');
    }

    try {
      const review = await this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.vendor', 'vendor')
        .leftJoinAndSelect('review.booking', 'booking')
        .leftJoinAndSelect('review.images', 'images')
        .where('review.id = :id', { id })
        .select([
          'review',
          'user.id',
          'user.email',
          'user.fullName',
          'user.phoneNumber',
          'user.avatarUrl',
          'user.status',
          'user.rank',
          'user.note',
          'user.auth',
          'user.lastLoginAt',
          'user.createdAt',
          'user.updatedAt',
          'vendor',
          'booking',
          'images'
        ])
        .getOne();

      if (!review) {
        throw new NotFoundException(`Không tìm thấy đánh giá với ID: ${id}`);
      }

      return review;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể lấy thông tin đánh giá: ' + error.message);
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, files: { images?: Express.Multer.File[] }): Promise<Review> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID đánh giá không hợp lệ');
    }

    // Validate rating if provided
    if (updateReviewDto.rating && (updateReviewDto.rating < 1 || updateReviewDto.rating > 5)) {
      throw new BadRequestException('Điểm đánh giá phải từ 1 đến 5');
    }

    try {
      const review = await this.findOne(id);

      // Check if trying to update bookingId
      if (updateReviewDto.bookingId && updateReviewDto.bookingId !== review.bookingId) {
        throw new BadRequestException('Không thể thay đổi đơn đặt chỗ của đánh giá');
      }

      // Check if trying to update vendorId
      if (updateReviewDto.vendorId && updateReviewDto.vendorId !== review.vendorId) {
        throw new BadRequestException('Không thể thay đổi nhà cung cấp của đánh giá');
      }

      Object.assign(review, updateReviewDto);
      await this.reviewRepository.save(review);

      // Upload new images if provided
      if (files?.images?.length) {
        if (files.images.length > 10) {
          throw new BadRequestException('Số lượng hình ảnh không được vượt quá 10');
        }

        const imageUrls = await this.uploadService.uploadImages(files.images, 'reviews');

        // Create review images
        const reviewImages = imageUrls.map(url =>
          this.reviewImageRepository.create({
            reviewId: review.id,
            imageUrl: url,
          })
        );
        await this.reviewImageRepository.save(reviewImages);
      }

      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể cập nhật đánh giá: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID đánh giá không hợp lệ');
    }

    try {
      const review = await this.findOne(id);

      // Delete associated images
      await this.reviewImageRepository.delete({ reviewId: id });

      // Delete review
      await this.reviewRepository.remove(review);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể xóa đánh giá: ' + error.message);
    }
  }

  async getAverageRatingByVendorId(vendorId: string): Promise<number> {
    if (!isUUID(vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    try {
      const reviews = await this.reviewRepository.find({
        where: { vendorId },
        select: ['rating'],
      });

      if (!reviews.length) return 0;

      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      return parseFloat((total / reviews.length).toFixed(2));
    } catch (error) {
      throw new BadRequestException('Không thể tính điểm đánh giá trung bình: ' + error.message);
    }
  }
}