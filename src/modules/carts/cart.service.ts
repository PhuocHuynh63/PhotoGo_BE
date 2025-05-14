import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { BadRequestException } from '@nestjs/common/exceptions';
import { UpdateCartDto } from './dto/update-cart.dto';

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
      throw new NotFoundException('Giỏ hàng không tồn tại hoặc bạn không có quyền truy cập');
    }
  
    // Kiểm tra trùng lặp service_package_id
    const existingItem = await this.cartItemRepository.findOne({
      where: { cartId: data.cartId, servicePackageId: data.servicePackageId },
    });
    if (existingItem) {
      throw new BadRequestException('Gói dịch vụ này đã tồn tại trong giỏ hàng');
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
      throw new NotFoundException(`Giỏ hàng với ID ${id} không tồn tại`);
    }

    return cart;
  }

  async findAllCarts(): Promise<Cart[]> {
    return await this.cartRepository.find({ relations: ['items', 'items.servicePackage'] });
  }

  async findCartItems(cartId: string): Promise<CartItem[]> {
    const cart = await this.cartRepository.findOne({ where: { id: cartId }, relations: ['items'] });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${cartId} không tồn tại`);
    }

    return cart.items;
  }

  async findCartItemsByUserId(userId: string): Promise<CartItem[]> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.servicePackage'],
    });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${userId} không tồn tại`);
    }

    return cart.items;
  }

  async updateCart(id: string, updateCartDto: UpdateCartDto): Promise<Cart> {
    const cart = await this.cartRepository.findOne({ where: { id } });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${id} không tồn tại`);
    }

    Object.assign(cart, updateCartDto);
    return await this.cartRepository.save(cart);
  }

  async removeCart(id: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ where: { id } });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${id} không tồn tại`);
    }

    await this.cartRepository.remove(cart);
  }

  async removeCartItem(cartId: string, itemId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ where: { id: cartId } });
    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${cartId} không tồn tại`);
    }

    const cartItem = await this.cartItemRepository.findOne({ where: { id: itemId, cartId } });
    if (!cartItem) {
      throw new NotFoundException(`Mục giỏ hàng với ID ${itemId} không tồn tại trong giỏ hàng ${cartId}`);
    }

    await this.cartItemRepository.remove(cartItem);
  }
}