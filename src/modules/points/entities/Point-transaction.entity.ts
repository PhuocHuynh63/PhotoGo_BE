import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Point } from './point.entity'; // Assuming there is a Point entity

import { PointTransactionType } from 'src/constants/point.enum'; // Assuming this enum is defined in your constants

@Entity('point_transaction')
export class PointTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Point, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'point_id' })
  point: Point;

  @Column({ type: 'integer', nullable: false })
  amount: number;

  @Column({ type: 'enum', enum: PointTransactionType})
  type: PointTransactionType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}