import { UserRank, UserStatus } from 'src/constants/user.enum';
import { Role } from 'src/modules/roles/entities/role.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { VoucherUser } from 'src/modules/vouchers/entities/voucher-user.entity';
import { UserCampaign } from 'src/modules/campaign/entities/user-campaign.entity';
import { Point } from 'src/modules/points/entities/point.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';

@Entity('users') // Tên bảng là "users"
export class User {
  @PrimaryGeneratedColumn('uuid') // UUID tự động tạo
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'old_password_hash', length: 255, nullable: true })
  oldPasswordHash?: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ name: 'avatar_url', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ default: UserStatus.INACTIVE })
  status: string;

  @Column({ default: UserRank.UNRANK })
  rank: string;

  @Column({
    name: 'multiplier', type: 'numeric',
    precision: 5,
    scale: 2,
    default: 1.0,
  })
  multiplier: number; // Hệ số nhân cho điểm thưởng

  @Column()
  note: string;

  @Column({ default: 'local' })
  auth: string;

  @UpdateDateColumn({ name: 'last_login_at', type: 'timestamptz' })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Role, (role) => role.users, { nullable: false }) // Quan hệ n-1 với bảng Role
  @JoinColumn({ name: 'role_id' }) // Khóa ngoại "role_id"
  role: Role;

  @OneToOne(() => Vendor, (vendor) => vendor.user_id)
  vendor: Vendor;

  @OneToMany(() => VoucherUser, (voucherUser) => voucherUser.user)
  voucherUsers: VoucherUser[];

  @OneToMany(() => UserCampaign, (userCampaign) => userCampaign.user)
  userCampaigns: UserCampaign[];

  @OneToMany(() => Point, (point) => point.user)
  points: Point[];

  @OneToOne(() => Subscription, (subscription) => subscription.user)
  subscription: Subscription;
}