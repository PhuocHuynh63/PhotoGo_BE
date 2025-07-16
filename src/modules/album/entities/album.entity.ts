import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VendorAlbum } from './vendor-album.entity';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'simple-array', nullable: true })
  photos: string[]; // tối đa 3 ảnh

  @Column({ type: 'simple-array', nullable: true })
  behindTheScenes: string[];

  @Column({ nullable: true })
  driveLink: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', precision: 3 })
  updatedAt: Date;

  @ManyToOne(() => VendorAlbum, (vendorAlbum) => vendorAlbum.albums)
  vendorAlbum: VendorAlbum;
} 