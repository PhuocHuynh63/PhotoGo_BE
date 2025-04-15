import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { BadRequestException } from '@nestjs/common/exceptions';

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

  async addCartItem(data: { servicePackageId: string; cartId: string; userId: string }): Promise<CartItem> {
    // Kiểm tra quyền sở hữu giỏ hàng
    const cart = await this.cartRepository.findOne({ where: { id: data.cartId, userId: data.userId } });
    if (!cart) {
      throw new NotFoundException('Cart not found or you do not have permission');
    }
  
    // Kiểm tra trùng lặp service_package_id
    const existingItem = await this.cartItemRepository.findOne({
      where: { cartId: data.cartId, servicePackageId: data.servicePackageId },
    });
    if (existingItem) {
      throw new BadRequestException('This service package is already in the cart');
    }
  
    // Tạo cart item mới
    const cartItem = this.cartItemRepository.create({
      cartId: data.cartId,
      servicePackageId: data.servicePackageId,
    });
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

  async findCartItemsByUserId(userId: string): Promise<CartItem[]> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.servicePackage'],
    });

    if (!cart) {
      throw new NotFoundException(`Cart with user ID ${userId} not found`);
    }

    return cart.items;
  }
}