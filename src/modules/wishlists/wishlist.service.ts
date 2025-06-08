import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(WishlistItem)
    private readonly wishlistItemRepository: Repository<WishlistItem>,
  ) {}

  async createWishlist(userId: string): Promise<Wishlist> {
    // Kiểm tra xem user đã có wishlist chưa
    const existingWishlist = await this.wishlistRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (existingWishlist) {
      return existingWishlist;
    }

    const wishlist = this.wishlistRepository.create({ userId });
    return await this.wishlistRepository.save(wishlist);
  }

  async addWishlistItem(addWishlistItemDto: AddWishlistItemDto): Promise<WishlistItem> {
    const wishlist = await this.wishlistRepository.findOne({ where: { id: addWishlistItemDto.wishlistId } });

    if (!wishlist) {
      throw new NotFoundException(`Danh sách mong muốn với ID ${addWishlistItemDto.wishlistId} không tồn tại`);
    }

    const wishlistItem = this.wishlistItemRepository.create(addWishlistItemDto);
    wishlistItem.wishlist = wishlist;

    return await this.wishlistItemRepository.save(wishlistItem);
  }

  async findWishlistById(id: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { id },
      relations: ['items', 'items.serviceConcept'],
    });

    if (!wishlist) {
      throw new NotFoundException(`Danh sách mong muốn với ID ${id} không tồn tại`);
    }

    return wishlist;
  }

  async findAllWishlists(paginationDto: PaginationDto): Promise<{ data: Wishlist[]; pagination: any }> {
    const { current = 1, pageSize = 10, sortBy = 'created_at', sortType = 'DESC' } = paginationDto;
    
    const [data, total] = await this.wishlistRepository.findAndCount({
      relations: ['items', 'items.serviceConcept'],
      skip: (current - 1) * pageSize,
      take: pageSize,
      order: {
        [sortBy]: sortType
      }
    });

    return {
      data,
      pagination: {
        current,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  async updateWishlist(id: string, updateWishlistDto: UpdateWishlistDto): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne({ where: { id } });

    if (!wishlist) {
      throw new NotFoundException(`Danh sách mong muốn với ID ${id} không tồn tại`);
    }

    Object.assign(wishlist, updateWishlistDto);
    return await this.wishlistRepository.save(wishlist);
  }

  async deleteWishlist(id: string): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({ where: { id } });

    if (!wishlist) {
      throw new NotFoundException(`Danh sách mong muốn với ID ${id} không tồn tại`);
    }

    await this.wishlistRepository.remove(wishlist);
  }
  
  async deleteWishlistItem(id: string, itemId: string): Promise<void> {
    const wishlistItem = await this.wishlistItemRepository.findOne({ 
      where: { id: itemId }, 
      relations: ['wishlist'] 
    });

    if (!wishlistItem) {
      throw new NotFoundException(`Mục trong danh sách mong muốn với ID ${itemId} không tồn tại`);
    }

    await this.wishlistItemRepository.remove(wishlistItem);
  }

  async findWishlistByUser(userId: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId },
      relations: ['items', 'items.serviceConcept']
    });

    if (!wishlist) {
      throw new NotFoundException(`Không tìm thấy danh sách mong muốn cho người dùng với ID ${userId}`);
    }

    return wishlist;
  }
}