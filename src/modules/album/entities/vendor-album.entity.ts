import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Album } from "./album.entity";
import { Location } from "src/modules/locations/entities/location.entity";

@Entity('vendor_albums')
export class VendorAlbum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Location, (location) => location.id)
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @OneToMany(() => Album, (album) => album.vendorAlbum)
  albums: Album[];

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', precision: 3 })
  updatedAt: Date;
}