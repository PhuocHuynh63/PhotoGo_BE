import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { ReviewImage } from './entities/review_image.entity';
import { ReviewService } from './reviews.service';
import { ReviewController } from './reviews.controller';
import { UploadModule } from '../../3rdService/upload/upload.module';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewImage, Booking]),
    UploadModule
  ],
  providers: [ReviewService],
  controllers: [ReviewController],
  exports: [ReviewService],
})
export class ReviewModule {}
