import { Column, CreateDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VendorAlbum } from './vendor-album.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @OneToOne(() => User, (user) => user.id)
  user: User;

  @Column({ type: 'text', array: true, nullable: true })
  photos: string[]; // tối đa 3 ảnh

  @Column({ type: 'text', array: true, nullable: true })
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