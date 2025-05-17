import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { ServiceConcept } from '../../service-package/entities/service-concept.entity';

@Entity('wishlist_item')
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wishlist, (wishlist) => wishlist.items, { nullable: false })
  @JoinColumn({ name: 'wishlist_id' })
  wishlist: Wishlist;

  @Column({ type: 'uuid', nullable: false, name: 'wishlist_id' })
  wishlistId: string;

  @ManyToOne(() => ServiceConcept, { nullable: false })
  @JoinColumn({ name: 'service_concept_id' })
  serviceConcept: ServiceConcept;

  @Column({ type: 'uuid', nullable: false, name: 'service_concept_id' })
  serviceConceptId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}