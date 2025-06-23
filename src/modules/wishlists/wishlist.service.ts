import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { PaginationDto } from './dto/pagination.dto';

interface TransformedWishlist extends Omit<Wishlist, 'items'> {
  items: Array<Omit<WishlistItem, 'serviceConcept'> & {
    serviceConcept: Omit<NonNullable<WishlistItem['serviceConcept']>, 'images'> & {
      images: string[];
    } | null;
  }>;
}

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
      where: { user: { id: userId } },
      relations: ['items', 'user'],
    });

    if (existingWishlist) {
      return existingWishlist;
    }

    const wishlist = this.wishlistRepository.create({ user: { id: userId } });
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

  async findAllWishlists(paginationDto: PaginationDto): Promise<{ data: TransformedWishlist[]; pagination: any }> {
    const { current = 1, pageSize = 10, sortBy = 'created_at', sortType = 'DESC' } = paginationDto;
    
    const [data, total] = await this.wishlistRepository.findAndCount({
      relations: {
        items: {
          serviceConcept: {
            images: true
          }
        }
      },
      skip: (current - 1) * pageSize,
      take: pageSize,
      order: {
        [sortBy]: sortType
      }
    });

    // Transform the data to only include image URLs
    const transformedData = data.map(wishlist => ({
      ...wishlist,
      items: wishlist.items.map(item => ({
        ...item,
        serviceConcept: item.serviceConcept ? {
          ...item.serviceConcept,
          images: item.serviceConcept.images.map(img => img.imageUrl)
        } : null
      }))
    })) as TransformedWishlist[];

    return {
      data: transformedData,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total
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

  async findWishlistByUser(userId: string, paginationDto: PaginationDto): Promise<{ data: TransformedWishlist[]; pagination: any }> {
    const { current = 1, pageSize = 10, sortBy = 'created_at', sortType = 'DESC' } = paginationDto;
    
    // First get the wishlist with all items
    const wishlist = await this.wishlistRepository.findOne({
      where: { user: { id: userId } },
      relations: {
        user: true,
        items: {
          serviceConcept: {
            images: true
          }
        }
      },
      order: {
        items: {
          [sortBy]: sortType
        }
      }
    });

    if (!wishlist) {
      return {
        data: [],
        pagination: {
          current,
          pageSize,
          totalPage: 0,
          totalItem: 0
        }
      };
    }

    const totalItems = wishlist.items.length;
    const startIndex = (current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Slice the items array based on pagination
    const paginatedItems = wishlist.items.slice(startIndex, endIndex);

    // Create a new wishlist object with paginated items
    const transformedWishlist = {
      ...wishlist,
      items: paginatedItems.map(item => ({
        ...item,
        serviceConcept: item.serviceConcept ? {
          ...item.serviceConcept,
          images: item.serviceConcept.images.map(img => img.imageUrl)
        } : null
      }))
    } as TransformedWishlist;

    return {
      data: [transformedWishlist],
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(totalItems / pageSize),
        totalItem: totalItems
      }
    };
  }

  async findWishlistByUserId(userId: string): Promise<Wishlist> {
    return await this.wishlistRepository.findOne({ where: { user: { id: userId } } });
  }
}