import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Review } from './review.entity';

@Entity('review_image')
export class ReviewImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  reviewId: string;

  @Column({ type: 'varchar', nullable: false })
  imageUrl: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Review, (review) => review.images)
  @JoinColumn({ name: 'review_id' })
  review: Review;
}
