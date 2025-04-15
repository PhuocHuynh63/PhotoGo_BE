import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(WishlistItem)
    private readonly wishlistItemRepository: Repository<WishlistItem>,
  ) {}

  async createWishlist(createWishlistDto: CreateWishlistDto): Promise<Wishlist> {
    const wishlist = this.wishlistRepository.create(createWishlistDto);
    return await this.wishlistRepository.save(wishlist);
  }

  async addWishlistItem(addWishlistItemDto: AddWishlistItemDto): Promise<WishlistItem> {
    const wishlist = await this.wishlistRepository.findOne({ where: { id: addWishlistItemDto.wishlistId } });

    if (!wishlist) {
      throw new NotFoundException(`Wishlist with ID ${addWishlistItemDto.wishlistId} not found`);
    }

    const wishlistItem = this.wishlistItemRepository.create(addWishlistItemDto);
    wishlistItem.wishlist = wishlist;

    return await this.wishlistItemRepository.save(wishlistItem);
  }

  async findWishlistById(id: string): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { id },
      relations: ['items', 'items.servicePackage'],
    });

    if (!wishlist) {
      throw new NotFoundException(`Wishlist with ID ${id} not found`);
    }

    return wishlist;
  }

    async findAllWishlists(): Promise<Wishlist[]> {
        return await this.wishlistRepository.find({ relations: ['items', 'items.servicePackage'] });
    }
}