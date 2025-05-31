import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewImage } from './entities/review_image.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
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

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewImage)
    private readonly reviewImageRepository: Repository<ReviewImage>,
    private readonly uploadService: UploadService,
  ) {}

  async create(createReviewDto: CreateReviewDto, files: { images?: Express.Multer.File[] }): Promise<Review> {
    // Validate required fields
    if(!createReviewDto.userId || !createReviewDto.bookingId) {
      throw new BadRequestException('userId và bookingId là bắt buộc');
    }
    if (!createReviewDto.rating || !createReviewDto.vendorId) {
      throw new BadRequestException('Điểm đánh giá và vendorId là bắt buộc');
    }

    // Validate vendorId is a UUID
    if (!isUUID(createReviewDto.vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    try {
      const review = this.reviewRepository.create(createReviewDto);
      const savedReview = await this.reviewRepository.save(review);

      // Upload images if provided
      if (files?.images?.length) {
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
      throw new BadRequestException('Không thể tạo đánh giá: ' + error.message);
    }
  }

  async findAll(): Promise<ReviewSummary[]> {
    try {
      return await this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.vendor', 'vendor')
        .select([
          'review.id',
          'review.rating',
          'review.comment',
          'user', // Updated to match the likely property name
          'vendor', // Updated to match the likely property name
        ])
        .getMany();
    } catch (error) {
      throw new BadRequestException('Không thể lấy đánh giá: ' + error.message);
    }
  }

  async findByVendorId(vendorId: string): Promise<Review[]> {
    // Validate vendorId is a UUID
    if (!isUUID(vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    try {
      const reviews = await this.reviewRepository.find({
        where: { vendorId },
        relations: ['vendor'],
      });

      if (!reviews.length) {
        throw new NotFoundException(`Không tìm thấy đánh giá cho vendor ID: ${vendorId}`);
      }

      return reviews;
    } catch (error) {
      throw new BadRequestException('Không thể lấy đánh giá: ' + error.message);
    }
  }

  async findOne(id: string): Promise<Review> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID đánh giá không hợp lệ');
    }

    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['user', 'vendor', 'booking'],
      });

      if (!review) {
        throw new NotFoundException(`Không tìm thấy đánh giá với ID: ${id}`);
      }

      return review;
    } catch (error) {
      throw new BadRequestException('Không thể lấy đánh giá: ' + error.message);
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, files: { images?: Express.Multer.File[] }): Promise<Review> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID đánh giá không hợp lệ');
    }

    try {
      const review = await this.findOne(id); // This will throw NotFoundException if not found
      Object.assign(review, updateReviewDto);
      await this.reviewRepository.save(review);

      // Upload new images if provided
      if (files?.images?.length) {
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
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
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
      const review = await this.findOne(id); // This will throw NotFoundException if not found
      await this.reviewRepository.remove(review);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      throw new BadRequestException('Không thể xóa đánh giá: ' + error.message);
    }
  }

  async getAverageRatingByVendorId(vendorId: string): Promise<number> {
    const reviews = await this.reviewRepository.find({
      where: { vendorId },
      select: ['rating'],
    });
  
    if (!reviews.length) return 0;
  
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return parseFloat((total / reviews.length).toFixed(2));
  }
  
}