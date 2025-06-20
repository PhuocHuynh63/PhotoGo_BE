import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewImage } from './entities/review_image.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { FilterReviewDto } from './dto/filter-review.dto';
import { isUUID } from 'class-validator';
import { UploadService } from '../../3rdService/upload/upload.service';
import { PaginationDto } from './dto/pagination.dto';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from 'src/constants/booking.enum';

// Define the return type for findAll
interface ReviewSummary {
  id: string;
  rating: number;
  comment: string;
  user: { fullName: string };
  vendor: { name: string };
}

interface ReviewResponse {
  id: string;
  comment: string;
  rating: number;
  createdAt: Date;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string;
  };
  vendor: {
    id: string;
    name: string;
    logoUrl: string;
  };
  images: string[];
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pageSize: number;
    totalPage: number;
    totalItem: number;
  };
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(ReviewImage)
    private readonly reviewImageRepository: Repository<ReviewImage>,
    private readonly uploadService: UploadService,
    private readonly dataSource: DataSource,
  ) { }

  async create(createReviewDto: CreateReviewDto, files: { images?: Express.Multer.File[] }): Promise<Review> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình tạo đánh giá');

    // Validate required fields
    if (!createReviewDto.userId || !createReviewDto.bookingId) {
      throw new BadRequestException('userId và bookingId là bắt buộc');
    }

    // Validate UUIDs
    if (!isUUID(createReviewDto.userId)) {
      throw new BadRequestException('Định dạng userId không hợp lệ');
    }
      if (!isUUID(createReviewDto.bookingId)) {
      throw new BadRequestException('Định dạng bookingId không hợp lệ');
    }

    // check bookingId có tồn tại
    const booking = await this.bookingRepository.findOne({
      where: { id: createReviewDto.bookingId }
    });
    if (!booking) {
      throw new BadRequestException('bookingId không tồn tại');
    }

    // check the status of booking is completed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Đơn hàng chưa hoàn thành nên không thể đánh giá');
    }

    // Validate rating
    if (!createReviewDto.rating || createReviewDto.rating < 1 || createReviewDto.rating > 5) {
      throw new BadRequestException('Điểm đánh giá phải từ 1 đến 5');
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
        
        // Create ReviewImage entities from the uploaded URLs
        const reviewImages = imageUrls.map(url => {
          const reviewImage = new ReviewImage();
          reviewImage.imageUrl = url;
          reviewImage.review = savedReview;
          return reviewImage;
        });

        // Save the review images
        savedReview.images = await this.reviewImageRepository.save(reviewImages);
        await this.reviewRepository.save(savedReview);
      }

      this.logger.log(`Đánh giá đã được tạo thành công trong ${Date.now() - startTime}ms`);
      return this.findOne(savedReview.id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể tạo đánh giá: ' + error.message);
    }
  }

  async findByUserId(userId: string, paginationDto: PaginationDto): Promise<PaginatedResponse<ReviewResponse>> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình lấy danh sách đánh giá theo userId');

    if (!isUUID(userId)) {
      throw new BadRequestException('Định dạng userId không hợp lệ');
    }

    const currentPage = paginationDto.current || 1;
    const pageSize = paginationDto.pageSize || 10;
    const skip = (currentPage - 1) * pageSize;

    const [reviews, total] = await Promise.all([
      this.reviewRepository.find({
        where: { userId },
        relations: [
          'user',
          'booking',
          'images',
          'booking.location',
          'booking.location.vendor',
        ],
        skip,
        take: pageSize,
        order: { createdAt: 'DESC' }
      }),
      this.reviewRepository.count({ where: { userId } })
    ]);

    if (reviews.length === 0) {
      return {
        data: [],
        pagination: {
          current: currentPage,
          pageSize,
          totalPage: 0,
          totalItem: 0,
        },
      };
    }

    const totalPage = Math.ceil(total / pageSize);

    this.logger.log(`Đã lấy danh sách đánh giá theo userId thành công trong ${Date.now() - startTime}ms`);

    return {
      data: reviews.map(review => ({
        id: review.id,
        comment: review.comment,
        rating: review.rating,
        createdAt: review.createdAt,
        user: {
          id: review.user.id,
          fullName: review.user.fullName,
          avatarUrl: review.user.avatarUrl,
          rank: review.user.rank,
          multiplier: review.user.multiplier,
          note: review.user.note,
          auth: review.user.auth
        },
        booking: {
          id: review.booking.id,
          date: review.booking.date,
          time: review.booking.time,
          depositAmount: review.booking.depositAmount,
          depositType: review.booking.depositType,
          userNote: review.booking.userNote,
          fullName: review.booking.fullName,
          phone: review.booking.phone,
          email: review.booking.email,
          status: review.booking.status,
        },
        images: review.images.map(img => img.imageUrl),
        vendor: {
          id: review.booking.location.vendor.id,
          name: review.booking.location.vendor.name,
          logoUrl: review.booking.location.vendor.logo,
          bannerUrl: review.booking.location.vendor.banner,
          description: review.booking.location.vendor.description,
          status: review.booking.location.vendor.status,
        },
      })),
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: total,
      },
    };
  }

  async findAll(filterDto: FilterReviewDto): Promise<PaginatedResponse<Review>> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình lấy danh sách đánh giá');

    const currentPage = filterDto.current || 1;
    const pageSize = filterDto.pageSize || 10;
    const actualPageSize = pageSize * pageSize; // Process double the requested size
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = filterDto.sortDirection === 'asc' ? 'ASC' : 'DESC';

    const filterConditions: string[] = [];
    const baseParams: any[] = [];

    // Base query for review filtering
    let baseQuery = `
      WITH filtered_reviews AS (
        SELECT r.id
        FROM review r
        LEFT JOIN "users" u ON u.id = r.user_id
        LEFT JOIN "booking" b ON b.id = r.booking_id
        LEFT JOIN "vendors" v ON v.id = b.vendor_id
        LEFT JOIN "review_image" ri ON ri.review_id = r.id
        WHERE 1=1
    `;

    // Add filters to base query dynamically
    if (filterDto.rating) {
      filterConditions.push(`r.rating = $${filterConditions.length + 1}`);
      baseParams.push(filterDto.rating);
    }

    // Append filters to the base query
    if (filterConditions.length > 0) {
      baseQuery += ` AND ${filterConditions.join(' AND ')}`;
    }

    baseQuery += `
      )
      SELECT 
        r.id,
        r.comment,
        r.rating,
        r.created_at,
        r.updated_at,
        u.id as user_id,
        u.full_name as user_full_name,
        u.avatar_url as user_avatar_url,
        b.id as booking_id,
        v.id as vendor_id,
        v.name as vendor_name,
        v.logo as vendor_logo_url,
        v.banner as vendor_banner_url,
        v.description as vendor_description,
        v.status as vendor_status,
        array_agg(DISTINCT ri.image_url) as review_image_urls
      FROM filtered_reviews fr
      JOIN review r ON r.id = fr.id
      LEFT JOIN "users" u ON u.id = r.user_id
      LEFT JOIN "booking" b ON b.id = r.booking_id
      LEFT JOIN "vendors" v ON v.id = b.vendor_id
      LEFT JOIN "review_image" ri ON ri.review_id = r.id
      GROUP BY 
        r.id,
        u.id,
        b.id,
        v.id
    `;

    // Add sorting
    switch (filterDto.sortBy) {
      case 'rating':
        baseQuery += ` ORDER BY r.rating ${sortDirection}`;
        break;
      case 'created_at':
      default:
        baseQuery += ` ORDER BY r.created_at ${sortDirection}`;
    }

    // Add pagination
    baseQuery += ` LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`;
    baseParams.push(actualPageSize, skip);

    // Get total count query
    const countFilterConditions: string[] = [];
    const countParams: any[] = [];

    let countQuery = `
      WITH filtered_reviews AS (
        SELECT DISTINCT r.id
        FROM review r
        LEFT JOIN "users" u ON u.id = r.user_id
        LEFT JOIN "booking" b ON b.id = r.booking_id
        LEFT JOIN "vendors" v ON v.id = b.vendor_id
        LEFT JOIN "review_image" ri ON ri.review_id = r.id
        WHERE 1=1
    `;

    // Add filters to count query dynamically
    if (filterDto.rating) {
      countFilterConditions.push(`r.rating = $${countFilterConditions.length + 1}`);
      countParams.push(filterDto.rating);
    }

    // Append filters to the count query
    if (countFilterConditions.length > 0) {
      countQuery += ` AND ${countFilterConditions.join(' AND ')}`;
    }

    countQuery += `
      )
      SELECT COUNT(DISTINCT id) as count
      FROM filtered_reviews
    `;

    // Execute queries
    const [reviewData, totalItem] = await Promise.all([
      this.dataSource.query(baseQuery, baseParams),
      this.dataSource.query(countQuery, countParams),
    ]);

    if (reviewData.length === 0) {
      return {
        data: [],
        pagination: {
          current: currentPage,
          pageSize,
          totalPage: 0,
          totalItem: 0,
        },
      };
    }

    // Transform the data
    const reviews = reviewData.map((row: any) => ({
      id: row.id,
      comment: row.comment,
      rating: row.rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        fullName: row.user_full_name,
        avatarUrl: row.user_avatar_url,
      },
      booking: {
        id: row.booking_id,
      },
      images: row.review_image_urls?.filter(url => url !== null) || [],
      vendor: row.vendor_id ? {
        id: row.vendor_id,
        name: row.vendor_name,
        logoUrl: row.vendor_logo_url,
        bannerUrl: row.vendor_banner_url,
        description: row.vendor_description,
      } : null,
    }));

    const totalPage = Math.ceil(Number(totalItem[0].count) / pageSize);

    this.logger.log(`Đã lấy danh sách đánh giá thành công trong ${Date.now() - startTime}ms`);

    return {
      data: reviews.slice(0, pageSize), // Only show requested page size
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: Number(totalItem[0].count),
      },
    };
  }

  async findByVendorId(vendorId: string, filterDto: FilterReviewDto): Promise<PaginatedResponse<ReviewResponse> & { averageRating: number }> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình lấy danh sách đánh giá theo vendor');

    if (!isUUID(vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    const currentPage = filterDto.current || 1;
    const pageSize = filterDto.pageSize || 10;
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = filterDto.sortDirection === 'asc' ? 'ASC' : 'DESC';

    try {
      // Tính averageRating cho tất cả review của vendor
      const avgResult = await this.reviewRepository
        .createQueryBuilder('review')
        .leftJoin('review.booking', 'booking')
        .leftJoin('booking.vendor', 'vendor')
        .where('vendor.id = :vendorId', { vendorId })
        .select('AVG(review.rating)', 'avg')
        .getRawOne();
      const averageRating = avgResult?.avg ? Number(avgResult.avg) : 0;

      // Build the base query
      const queryBuilder = this.reviewRepository
        .createQueryBuilder('review')
        .leftJoinAndSelect('review.booking', 'booking')
        .leftJoinAndSelect('booking.vendor', 'vendor')
        .leftJoinAndSelect('review.user', 'user')
        .leftJoinAndSelect('review.images', 'images')
        .where('vendor.id = :vendorId', { vendorId });

      // Add rating filter if provided
      if (filterDto.rating) {
        queryBuilder.andWhere('review.rating = :rating', { rating: filterDto.rating });
      }

      // Add sorting
      if (filterDto.sortBy === 'rating') {
        queryBuilder.orderBy('review.rating', sortDirection);
      } else {
        queryBuilder.orderBy('review.createdAt', sortDirection);
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Add pagination
      queryBuilder.skip(skip).take(pageSize);

      // Execute query
      const reviews = await queryBuilder.getMany();

      if (reviews.length === 0) {
        return {
          data: [],
          pagination: {
            current: currentPage,
            pageSize,
            totalPage: 0,
            totalItem: 0,
          },
          averageRating: Number(parseFloat(averageRating.toString()).toFixed(1)),
        };
      }

      const transformedReviews = reviews.map(review => ({
        id: review.id,
        comment: review.comment,
        rating: review.rating,
        createdAt: review.createdAt,
        user: review.user ? {
          id: review.user.id,
          fullName: review.user.fullName,
          avatarUrl: review.user.avatarUrl,
        } : null,
        vendor: review.vendor ? {
          id: review.vendor.id,
          name: review.vendor.name,
          logoUrl: review.vendor.logo,
          bannerUrl: review.vendor.banner,
          description: review.vendor.description,
          status: review.vendor.status,
        } : null,
        images: review.images?.map(img => img.imageUrl) || [],
      }));

      const totalPage = Math.ceil(total / pageSize);

      this.logger.log(`Đã lấy danh sách đánh giá theo vendor thành công trong ${Date.now() - startTime}ms`);

      return {
        data: transformedReviews,
        pagination: {
          current: currentPage,
          pageSize,
          totalPage,
          totalItem: total,
        },
        averageRating: Number(parseFloat(averageRating.toString()).toFixed(1)),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy đánh giá của nhà cung cấp: ${error.message}`);
      throw new BadRequestException('Lỗi khi lấy đánh giá của nhà cung cấp');
    }
  }

  async findOne(id: string): Promise<Review> {
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID đánh giá không hợp lệ');
    }

    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'booking'],
    });

    if (!review) {
      throw new NotFoundException(`Không tìm thấy đánh giá với ID ${id}`);
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, files: { images?: Express.Multer.File[] }): Promise<Review> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình cập nhật đánh giá');

    const review = await this.findOne(id);

    // Update basic fields
    if (updateReviewDto.comment !== undefined) review.comment = updateReviewDto.comment;
    if (updateReviewDto.rating !== undefined) {
      if (updateReviewDto.rating < 1 || updateReviewDto.rating > 5) {
        throw new BadRequestException('Điểm đánh giá phải từ 1 đến 5');
      }
      review.rating = updateReviewDto.rating;
    }

    // Upload new images if provided
    if (files?.images?.length) {
      if (files.images.length > 10) {
        throw new BadRequestException('Số lượng hình ảnh không được vượt quá 10');
      }

      const imageUrls = await this.uploadService.uploadImages(files.images, 'reviews');
      review.images = imageUrls.map(url => {
        const reviewImage = new ReviewImage();
        reviewImage.imageUrl = url;
        reviewImage.review = review;
        return reviewImage;
      });
    }

    const updatedReview = await this.reviewRepository.save(review);
    this.logger.log(`Đánh giá đã được cập nhật thành công trong ${Date.now() - startTime}ms`);
    return this.findOne(updatedReview.id);
  }

  async remove(id: string): Promise<void> {
    const review = await this.findOne(id);
    await this.reviewRepository.remove(review);
  }

  async getAverageRatingByBookingId(bookingId: string): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .where('review.bookingId = :bookingId', { bookingId })
      .getRawOne();

    return result ? Number(result.averageRating) : 0;
  }

  async getAverageRatingByVendorId(vendorId: string): Promise<number> {
    const avgResult = await this.reviewRepository
      .createQueryBuilder('review')
      .where('review.vendorId = :vendorId', { vendorId })
      .select('AVG(review.rating)', 'avg')
      .getRawOne();

    const averageRating = avgResult?.avg ? Number(avgResult.avg) : 0;
    return averageRating;
  }
}