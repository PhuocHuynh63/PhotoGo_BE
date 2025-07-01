import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Voucher } from '../../vouchers/entities/voucher.entity';
import { VoucherUserFromEnum, VoucherUserStatusEnum } from '../../../constants/voucher.enum';

@Entity('voucher_user')
export class VoucherUser {
  @PrimaryColumn({ type: 'uuid' })
  voucher_id: string;

  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => Voucher, { nullable: false })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: VoucherUserStatusEnum;

  @Column({ type: 'enum', enum: VoucherUserFromEnum, nullable: true })
  from: VoucherUserFromEnum;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  assigned_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  used_at: Date | null;
}