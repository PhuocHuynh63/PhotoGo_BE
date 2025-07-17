import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VendorAlbum } from './vendor-album.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Booking } from 'src/modules/bookings/entities/booking.entity';
import { AlbumStatus } from 'src/constants/album.enum';
@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  bookingId: string;

  @OneToOne(() => Booking, (booking) => booking.id)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'text', array: true, nullable: true })
  photos: string[]; // tối đa 3 ảnh

  @Column({ type: 'text', array: true, nullable: true })
  behindTheScenes: string[];

  @Column({ nullable: true })
  driveLink: string;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ type: 'enum', enum: AlbumStatus, default: AlbumStatus.NOT_UPLOAD, nullable: true })
  status: AlbumStatus;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', precision: 3 })
  updatedAt: Date;

  @ManyToOne(() => VendorAlbum, (vendorAlbum) => vendorAlbum.albums)
  @JoinColumn({ name: 'vendor_album_id' })
  vendorAlbum: VendorAlbum;
} 