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
        SELECT DISTINCT r.id
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
      SELECT DISTINCT
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
        array_agg(ri.image_url) as review_image_urls
      FROM filtered_reviews fr
      JOIN review r ON r.id = fr.id
      LEFT JOIN "users" u ON u.id = r.user_id
      LEFT JOIN "booking" b ON b.id = r.booking_id
      LEFT JOIN "vendors" v ON v.id = b.vendor_id
      LEFT JOIN "review_image" ri ON ri.review_id = r.id
      GROUP BY 
        r.id,
        r.comment,
        r.rating,
        r.created_at,
        r.updated_at,
        u.id,
        u.full_name,
        u.avatar_url,
        b.id,
        v.id,
        v.name,
        v.logo,
        v.banner,
        v.description,
        v.status
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
      vendor: {
        id: row.vendor_id,
        name: row.vendor_name,
        logoUrl: row.vendor_logo_url,
        bannerUrl: row.vendor_banner_url,
        description: row.vendor_description,
        status: row.vendor_status,
      },
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

  async findByVendorId(vendorId: string, filterDto: FilterReviewDto): Promise<PaginatedResponse<Review>> {
    const startTime = Date.now();
    this.logger.log('Bắt đầu quá trình lấy danh sách đánh giá theo vendor');

    if (!isUUID(vendorId)) {
      throw new BadRequestException('Định dạng vendorId không hợp lệ');
    }

    const currentPage = filterDto.current || 1;
    const pageSize = filterDto.pageSize || 10;
    const actualPageSize = pageSize * pageSize;
    const skip = (currentPage - 1) * pageSize;
    const sortDirection = filterDto.sortDirection === 'asc' ? 'ASC' : 'DESC';

    const filterConditions: string[] = [`v.id = $1`];
    const baseParams: any[] = [vendorId];

    let baseQuery = `
      WITH filtered_reviews AS (
        SELECT DISTINCT r.id
        FROM review r
        LEFT JOIN "users" u ON u.id = r.user_id
        LEFT JOIN "booking" b ON b.id = r.booking_id
        LEFT JOIN "vendors" v ON v.id = b.vendor_id
        LEFT JOIN "review_image" ri ON ri.review_id = r.id
        WHERE 1=1
    `;

    if (filterDto.rating) {
      filterConditions.push(`r.rating = $${filterConditions.length + 1}`);
      baseParams.push(filterDto.rating);
    }

    if (filterConditions.length > 0) {
      baseQuery += ` AND ${filterConditions.join(' AND ')}`;
    }

    baseQuery += `
      )
      SELECT DISTINCT
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
        array_agg(ri.image_url) as review_image_urls
      FROM filtered_reviews fr
      JOIN review r ON r.id = fr.id
      LEFT JOIN "users" u ON u.id = r.user_id
      LEFT JOIN "booking" b ON b.id = r.booking_id
      LEFT JOIN "vendors" v ON v.id = b.vendor_id
      LEFT JOIN "review_image" ri ON ri.review_id = r.id
      GROUP BY 
        r.id,
        r.comment,
        r.rating,
        r.created_at,
        r.updated_at,
        u.id,
        u.full_name,
        u.avatar_url,
        b.id,
        v.id,
        v.name,
        v.logo,
        v.banner,
        v.description,
        v.status
    `;

    switch (filterDto.sortBy) {
      case 'rating':
        baseQuery += ` ORDER BY r.rating ${sortDirection}`;
        break;
      case 'created_at':
      default:
        baseQuery += ` ORDER BY r.created_at ${sortDirection}`;
    }

    baseQuery += ` LIMIT $${baseParams.length + 1} OFFSET $${baseParams.length + 2}`;
    baseParams.push(actualPageSize, skip);

    const countFilterConditions: string[] = [`v.id = $1`];
    const countParams: any[] = [vendorId];

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

    if (filterDto.rating) {
      countFilterConditions.push(`r.rating = $${countFilterConditions.length + 1}`);
      countParams.push(filterDto.rating);
    }

    if (countFilterConditions.length > 0) {
      countQuery += ` AND ${countFilterConditions.join(' AND ')}`;
    }

    countQuery += `
      )
      SELECT COUNT(DISTINCT id) as count
      FROM filtered_reviews
    `;

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
      vendor: {
        id: row.vendor_id,
        name: row.vendor_name,
        logoUrl: row.vendor_logo_url,
        bannerUrl: row.vendor_banner_url,
        description: row.vendor_description,
        status: row.vendor_status,
      },
    }));

    const totalPage = Math.ceil(Number(totalItem[0].count) / pageSize);

    this.logger.log(`Đã lấy danh sách đánh giá theo vendor thành công trong ${Date.now() - startTime}ms`);

    return {
      data: reviews.slice(0, pageSize),
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem: Number(totalItem[0].count),
      },
    };
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
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'averageRating')
      .where('review.vendorId = :vendorId', { vendorId })
      .getRawOne();

    return result ? Number(result.averageRating) : 0;
  }
}