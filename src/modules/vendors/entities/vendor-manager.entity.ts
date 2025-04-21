import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { User } from '../../users/entities/user.entity';

import { VendorManagerRole } from '../../../constants/vendor.enum';

@Entity('vendor_managers')
export class VendorManager {
  @PrimaryColumn({ type: 'uuid' })
  vendorId: string;

  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Vendor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: VendorManagerRole, nullable: false })
  role: VendorManagerRole;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}