import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { isUUID } from 'class-validator';

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
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    // Validate required fields
    if (!createReviewDto.rating || !createReviewDto.vendorId) {
      throw new BadRequestException('Rating and vendorId are required');
    }

    // Validate vendorId is a UUID
    if (!isUUID(createReviewDto.vendorId)) {
      throw new BadRequestException('Invalid vendorId format');
    }

    try {
      const review = this.reviewRepository.create(createReviewDto);
      return await this.reviewRepository.save(review);
    } catch (error) {
      throw new BadRequestException('Failed to create review: ' + error.message);
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
      throw new BadRequestException('Failed to fetch reviews: ' + error.message);
    }
  }

  async findByVendorId(vendorId: string): Promise<Review[]> {
    // Validate vendorId is a UUID
    if (!isUUID(vendorId)) {
      throw new BadRequestException('Invalid vendorId format');
    }

    try {
      const reviews = await this.reviewRepository.find({
        where: { vendorId },
        relations: ['vendor'],
      });

      if (!reviews.length) {
        throw new NotFoundException(`No reviews found for vendor ID: ${vendorId}`);
      }

      return reviews;
    } catch (error) {
      throw new BadRequestException('Failed to fetch reviews: ' + error.message);
    }
  }

  async findOne(id: string): Promise<Review> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid review ID format');
    }

    try {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['user', 'vendor', 'booking'],
      });

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      return review;
    } catch (error) {
      throw new BadRequestException('Failed to fetch review: ' + error.message);
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid review ID format');
    }

    try {
      const review = await this.findOne(id); // This will throw NotFoundException if not found
      Object.assign(review, updateReviewDto);
      return await this.reviewRepository.save(review);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      throw new BadRequestException('Failed to update review: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    // Validate id is a UUID
    if (!isUUID(id)) {
      throw new BadRequestException('Invalid review ID format');
    }

    try {
      const review = await this.findOne(id); // This will throw NotFoundException if not found
      await this.reviewRepository.remove(review);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException
      }
      throw new BadRequestException('Failed to delete review: ' + error.message);
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