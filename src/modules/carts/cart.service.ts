import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
  ) {}

  async createCart(createCartDto: CreateCartDto): Promise<Cart> {
    const cart = this.cartRepository.create(createCartDto);
    return await this.cartRepository.save(cart);
  }

  async addCartItem(addCartItemDto: AddCartItemDto): Promise<CartItem> {
    const cart = await this.cartRepository.findOne({ where: { id: addCartItemDto.cartId } });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${addCartItemDto.cartId} not found`);
    }

    const cartItem = this.cartItemRepository.create(addCartItemDto);
    cartItem.cart = cart;

    return await this.cartItemRepository.save(cartItem);
  }

  async findCartById(id: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id },
      relations: ['items', 'items.servicePackage'],
    });

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${id} not found`);
    }

    return cart;
  }

    async findAllCarts(): Promise<Cart[]> {
        return await this.cartRepository.find({ relations: ['items', 'items.servicePackage'] });
    }

    async findCartItems(cartId: string): Promise<CartItem[]> {
        const cart = await this.cartRepository.findOne({ where: { id: cartId }, relations: ['items'] });

        if (!cart) {
            throw new NotFoundException(`Cart with ID ${cartId} not found`);
        }

        return cart.items;
    }
}