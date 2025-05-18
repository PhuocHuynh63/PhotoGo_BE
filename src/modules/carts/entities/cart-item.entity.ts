import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { ServiceConcept } from 'src/modules/service-package/entities/service-concept.entity';

@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { nullable: false })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ type: 'uuid', nullable: false })
  cartId: string;

  @ManyToOne(() => ServiceConcept, { nullable: false })
  @JoinColumn({ name: 'service_concept_id' })
  serviceConcept: ServiceConcept;

  @Column({ type: 'uuid', nullable: false })
  serviceConceptId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;


}