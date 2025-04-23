import { Invoice } from 'src/modules/invoices/entities/invoice.entity';
import { Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { VoucherStatusEnum, VoucherUserStatusEnum } from '../../../constants/voucher.enum';

@Entity('voucher')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  discount_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  discount_value: number;

  @Column({ type: 'date', nullable: false })
  start_date: string;

  @Column({ type: 'date', nullable: false })
  end_date: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  status: VoucherStatusEnum;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}