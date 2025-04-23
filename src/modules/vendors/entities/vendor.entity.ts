import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Location } from '../../locations/entities/location.entity';
import { VendorStatus } from 'src/constants/vendor.enum';
import { ServicePackage } from '../../service-package/entities/service-package.entity';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  slug: string;

  @ManyToOne(() => Category, (category) => category.vendors, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({type: 'varchar', length: 100, nullable: true})
  logo?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  banner?: string;

  @Column({ type: 'enum', enum: VendorStatus, default: VendorStatus.ACTIVE })
  status: VendorStatus;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;

  @OneToMany(() => Location, (location) => location.vendor, { cascade: true })
  locations: Location[];

  @OneToMany(() => ServicePackage, (servicePackage) => servicePackage.vendor)
  servicePackages: ServicePackage[];
}