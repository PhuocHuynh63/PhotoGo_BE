import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { TeamMember } from '../../team-members/entities/team-member.entity';
import { LocationAvailability } from './location-availability.entity';
import { VendorAlbum } from 'src/modules/album/entities/vendor-album.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.locations, { nullable: false })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'text', nullable: false })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  district: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  ward: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  city: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  province: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @OneToOne(() => LocationAvailability, (availability) => availability.location, { cascade: true })
  availability: LocationAvailability;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToOne(() => TeamMember, (teamMember) => teamMember.location, { cascade: true })
  teamMember: TeamMember;

  @OneToOne(() => VendorAlbum, (vendorAlbum) => vendorAlbum.location, { cascade: true })
  vendorAlbum: VendorAlbum;
}