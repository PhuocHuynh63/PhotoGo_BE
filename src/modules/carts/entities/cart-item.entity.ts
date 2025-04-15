import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { ServicePackage } from '../../service-package/entities/service-package.entity';

@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { nullable: false })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ type: 'uuid', nullable: false })
  cartId: string;

  @ManyToOne(() => ServicePackage, { nullable: false })
  @JoinColumn({ name: 'service_package_id' })
  servicePackage: ServicePackage;

  @Column({ type: 'uuid', nullable: false, name: 'service_package_id' })
  servicePackageId: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}