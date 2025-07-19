import { Invoice } from 'src/modules/invoices/entities/invoice.entity';
import { Column, Entity, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, OneToMany, OneToOne } from 'typeorm';
import { VoucherStatusEnum, VoucherTypeDiscount, VoucherTypePoint } from '../../../constants/voucher.enum';
import { CampaignVoucher } from 'src/modules/campaign/entities/campaign-voucher.entity';

@Entity('voucher')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: VoucherTypeDiscount, nullable: false })
  discount_type: VoucherTypeDiscount;

  @Column({ type: 'decimal', precision: 10, nullable: false })
  discount_value: number;

  @Column({ type: 'integer', nullable: false, name: 'minprice' })
  minPrice: number;

  @Column({ type: 'integer', nullable: false, name: 'maxprice' })
  maxPrice: number;

  @Column({ type: 'integer', nullable: false })
  quantity: number;

  @Column({ type: 'integer', nullable: false, name: 'usedcount' })
  usedCount: number;

  @Column({ type: 'enum', enum: VoucherTypePoint, nullable: false, default: VoucherTypePoint.POINT })
  type: VoucherTypePoint;

  @Column({ type: 'integer', nullable: false })
  point: number;

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

  @OneToMany(() => CampaignVoucher, campaignVoucher => campaignVoucher.voucher)
  campaignVouchers: CampaignVoucher[];

  @OneToOne(() => Invoice, invoice => invoice.voucher)
  invoice: Invoice;
}