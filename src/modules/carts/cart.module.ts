import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ServiceConcept } from '../service-package/entities/service-concept.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, ServiceConcept])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}