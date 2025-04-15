import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';

@ApiTags('Wishlists')
@ApiBearerAuth('access-token')
@Controller('wishlists')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wishlist' })
  @ApiResponse({ status: 201, description: 'Wishlist created successfully', type: Wishlist })
  async createWishlist(@Body() createWishlistDto: CreateWishlistDto): Promise<Wishlist> {
    return await this.wishlistService.createWishlist(createWishlistDto);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add an item to the wishlist' })
  @ApiResponse({ status: 201, description: 'Item added to wishlist successfully', type: WishlistItem })
  async addWishlistItem(@Body() addWishlistItemDto: AddWishlistItemDto): Promise<WishlistItem> {
    return await this.wishlistService.addWishlistItem(addWishlistItemDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a wishlist by ID' })
  @ApiResponse({ status: 200, description: 'Wishlist details', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Wishlist not found' })
  async findWishlistById(@Param('id') id: string): Promise<Wishlist> {
    return await this.wishlistService.findWishlistById(id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Retrieve all items in a wishlist' })
  @ApiResponse({ status: 200, description: 'List of items in the wishlist', type: [WishlistItem] })
  @ApiResponse({ status: 404, description: 'Wishlist not found' })
    async findWishlistItems(@Param('id') id: string): Promise<WishlistItem[]> {
        const wishlist = await this.wishlistService.findWishlistById(id);
        return wishlist.items;
    }

  @Get()
  @ApiOperation({ summary: 'Retrieve all wishlists' })
  @ApiResponse({ status: 200, description: 'List of all wishlists', type: [Wishlist] })
    async findAllWishlists(): Promise<Wishlist[]> {
        return await this.wishlistService.findAllWishlists();
    }
}