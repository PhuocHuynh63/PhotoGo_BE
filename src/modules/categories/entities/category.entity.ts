import { Vendor } from 'src/modules/vendors/entities/vendor.entity';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  created_at: Date;

  @Column({ type: 'date', nullable: true })
  updated_at: Date;

  @OneToMany(() => Vendor, (vendor) => vendor.category, { nullable: false })
  vendors: Vendor[];
}