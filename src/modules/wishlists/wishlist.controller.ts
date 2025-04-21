import { Controller, Post, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
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

  @Get()
  @ApiOperation({ summary: 'Retrieve all wishlists' })
  @ApiResponse({ status: 200, description: 'List of all wishlists', type: [Wishlist] })
  async findAllWishlists(): Promise<Wishlist[]> {
    return await this.wishlistService.findAllWishlists();
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Retrieve all items in a wishlist' })
  @ApiResponse({ status: 200, description: 'List of items in the wishlist', type: [WishlistItem] })
  @ApiResponse({ status: 404, description: 'Wishlist not found' })
  async findWishlistItems(@Param('id') id: string): Promise<WishlistItem[]> {
    const wishlist = await this.wishlistService.findWishlistById(id);
    return wishlist.items;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a wishlist by ID' })
  @ApiResponse({ status: 200, description: 'Wishlist details', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Wishlist not found' })
  async findWishlistById(@Param('id') id: string): Promise<Wishlist> {
    return await this.wishlistService.findWishlistById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a wishlist by ID' })
  @ApiResponse({ status: 200, description: 'Wishlist updated successfully', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Wishlist not found' })
  async updateWishlist(@Param('id') id: string, @Body() updateWishlistDto: UpdateWishlistDto): Promise<Wishlist> {
    return await this.wishlistService.updateWishlist(id, updateWishlistDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a wishlist by ID' })
  @ApiResponse({ status: 200, description: 'Wishlist deleted successfully' })
  @ApiResponse({ status: 404, description: 'Wishlist not found' })
  async deleteWishlist(@Param('id') id: string): Promise<void> {
    return await this.wishlistService.deleteWishlist(id);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the wishlist' })
  @ApiResponse({ status: 200, description: 'Item removed from wishlist successfully' })
  @ApiResponse({ status: 404, description: 'Wishlist or item not found' })
  async deleteWishlistItem(@Param('id') id: string, @Param('itemId') itemId: string): Promise<void> {
    return await this.wishlistService.deleteWishlistItem(id, itemId);
  }
}