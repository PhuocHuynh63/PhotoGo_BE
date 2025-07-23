import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { UpdateCartDto } from './dto/update-cart.dto';
import { ServiceConcept } from '../service-package/entities/service-concept.entity';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(ServiceConcept)
    private readonly serviceConceptRepository: Repository<ServiceConcept>,
  ) {}

  async createCart(userId: string): Promise<Cart> {
    // Kiểm tra xem user đã có giỏ hàng chưa
    const existingCart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (existingCart) {
      return existingCart;
    }

    const cart = this.cartRepository.create({ userId });
    return await this.cartRepository.save(cart);
  }

  async addCartItem(data: { serviceConceptId: string; cartId: string; userId: string }): Promise<CartItem> {
    // Kiểm tra service concept tồn tại
    const serviceConcept = await this.serviceConceptRepository.findOne({
      where: { id: data.serviceConceptId },
    });

    if (!serviceConcept) {
      throw new NotFoundException(`Không tìm thấy khái niệm dịch vụ với ID ${data.serviceConceptId}`);
    }

    // Kiểm tra quyền sở hữu giỏ hàng
    const cart = await this.cartRepository.findOne({ 
      where: { id: data.cartId, userId: data.userId },
      relations: ['items'],
    });

    if (!cart) {
      throw new NotFoundException('Giỏ hàng không tồn tại hoặc bạn không có quyền truy cập');
    }

    // Kiểm tra số lượng item trong giỏ hàng
    if (cart.items && cart.items.length >= 10) {
      throw new BadRequestException('Giỏ hàng đã đạt giới hạn số lượng mục (tối đa 10 mục)');
    }
  
    // Kiểm tra trùng lặp service_concept_id
    const existingItem = await this.cartItemRepository.findOne({
      where: { cartId: data.cartId, serviceConceptId: data.serviceConceptId },
    });

    if (existingItem) {
      throw new BadRequestException('Gói dịch vụ này đã tồn tại trong giỏ hàng');
    }
  
    // Tạo cart item mới
    const cartItem = this.cartItemRepository.create({
      cartId: data.cartId,
      serviceConceptId: data.serviceConceptId,
    });

    return await this.cartItemRepository.save(cartItem);
  }

  async findCartById(id: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { id },
      relations: ['items', 'items.serviceConcept'],
    });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${id} không tồn tại`);
    }

    return cart;
  }

  async findAllCarts(paginationDto: PaginationDto): Promise<{ data: Cart[]; 
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = paginationDto;
    const skip = (current - 1) * pageSize;
    const carts = await this.cartRepository.find({ 
      relations: ['items', 'items.serviceConcept', 'items.serviceConcept.images'],
      order: {
        [sortBy]: sortDirection
      },
      skip,
      take: pageSize
    });
    const total = await this.cartRepository.count();

    // Format the response while maintaining type safety
    const formattedCarts = carts.map(cart => {
      const formattedItems = cart.items.map(item => ({
        ...item,
        serviceConcept: {
          ...item.serviceConcept,
          images: item.serviceConcept.images.map(img => ({
            ...img,
            imageUrl: img.imageUrl
          }))
        }
      }));

      return {
        ...cart,
        items: formattedItems
      };
    });

    return {
      data: formattedCarts,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total
      }
    };
  }

  async findCartItems(cartId: string): Promise<{ data: CartItem[]; 
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const cart = await this.cartRepository.findOne({ 
      where: { id: cartId }, 
      relations: ['items', 'items.serviceConcept', 'items.serviceConcept.images'],
      order: {
        items: {
          created_at: 'DESC'
        }
      }
    });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${cartId} không tồn tại`);
    }

    const totalItems = cart.items.length;
    const pageSize = 10;
    const current = 1;
    const startIndex = (current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Slice the items array based on pagination
    const paginatedItems = cart.items.slice(startIndex, endIndex);

    // Format the items
    const formattedItems = paginatedItems.map(item => ({
      ...item,
      serviceConcept: {
        ...item.serviceConcept,
        images: item.serviceConcept.images.map(img => ({
          ...img,
          imageUrl: img.imageUrl
        }))
      }
    }));

    return {
      data: formattedItems,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(totalItems / pageSize),
        totalItem: totalItems
      }
    };
  }

  async findCartItemsByUserId(userId: string): Promise<{ data: CartItem[]; 
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.serviceConcept', 'items.serviceConcept.images'],
      order: {
        items: {
          created_at: 'DESC'
        }
      }
    });
    if (!cart) {
      throw new NotFoundException(`Không tìm thấy giỏ hàng cho người dùng với ID ${userId}`);
    }
    const total = cart.items.length;
    const formattedItems = cart.items.map(item => ({
      ...item,
      serviceConcept: {
        ...item.serviceConcept,
        images: item.serviceConcept.images.map(img => ({
          ...img,
          imageUrl: img.imageUrl
        }))
      },
      finalPrice: item.serviceConcept ? Math.floor(item.serviceConcept.price * 1.35) : null
    }));
    return {
      data: formattedItems,
      pagination: {
        current: 1,
        pageSize: 10,
        totalPage: Math.ceil(total / 10),
        totalItem: total
      }
    };
  }

  async updateCart(id: string, updateCartDto: UpdateCartDto): Promise<Cart> {
    const cart = await this.cartRepository.findOne({ 
      where: { id },
      relations: ['items']
    });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${id} không tồn tại`);
    }

    // Kiểm tra nếu đang cập nhật userId
    if (updateCartDto.userId) {
      // Kiểm tra xem user mới đã có giỏ hàng chưa
      const existingCart = await this.cartRepository.findOne({
        where: { userId: updateCartDto.userId },
      });

      if (existingCart && existingCart.id !== id) {
        throw new BadRequestException('Người dùng đã có giỏ hàng khác');
      }
    }

    Object.assign(cart, updateCartDto);
    return await this.cartRepository.save(cart);
  }

  async removeCart(id: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ 
      where: { id },
      relations: ['items']
    });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${id} không tồn tại`);
    }

    // Xóa tất cả các items trong giỏ hàng trước
    if (cart.items && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }

    await this.cartRepository.remove(cart);
  }

  async removeCartItem(cartId: string, itemId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({ 
      where: { id: cartId },
      relations: ['items']
    });

    if (!cart) {
      throw new NotFoundException(`Giỏ hàng với ID ${cartId} không tồn tại`);
    }

    const cartItem = await this.cartItemRepository.findOne({ 
      where: { id: itemId, cartId },
      relations: ['serviceConcept']
    });

    if (!cartItem) {
      throw new NotFoundException(`Mục giỏ hàng với ID ${itemId} không tồn tại trong giỏ hàng ${cartId}`);
    }

    await this.cartItemRepository.remove(cartItem);
  }

  async findCartByUserId(userId: string): Promise<Cart | null> {
    // Lấy cart kèm items và serviceConcept
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.serviceConcept'],
    });
    if (!cart) return null;
    // Thêm trường finalPrice cho từng item
    cart.items = cart.items.map(item => ({
      ...item,
      finalPrice: item.serviceConcept ? Math.round(item.serviceConcept.price * 1.35) : null
    }));
    return cart;
  }
}