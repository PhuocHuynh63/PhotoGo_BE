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

  @Post(':user_id')
  @ApiOperation({ summary: 'Tạo danh sách mong muốn mới' })
  @ApiResponse({ status: 201, description: 'Danh sách mong muốn đã được tạo thành công', type: Wishlist })
  async createWishlist(@Param('user_id') userId: string): Promise<Wishlist> {
    return await this.wishlistService.createWishlist(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm một mục vào danh sách mong muốn' })
  @ApiResponse({ status: 201, description: 'Mục đã được thêm vào danh sách mong muốn thành công', type: WishlistItem })
  async addWishlistItem(@Body() addWishlistItemDto: AddWishlistItemDto): Promise<WishlistItem> {
    return await this.wishlistService.addWishlistItem(addWishlistItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả danh sách mong muốn', type: [Wishlist] })
  async findAllWishlists(): Promise<Wishlist[]> {
    return await this.wishlistService.findAllWishlists();
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Lấy tất cả các mục trong danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả các mục trong danh sách mong muốn', type: [WishlistItem] })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async findWishlistItems(@Param('id') id: string): Promise<WishlistItem[]> {
    const wishlist = await this.wishlistService.findWishlistById(id);
    return wishlist.items;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết của danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Chi tiết của danh sách mong muốn', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async findWishlistById(@Param('id') id: string): Promise<Wishlist> {
    return await this.wishlistService.findWishlistById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Danh sách mong muốn đã được cập nhật thành công', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async updateWishlist(@Param('id') id: string, @Body() updateWishlistDto: UpdateWishlistDto): Promise<Wishlist> {
    return await this.wishlistService.updateWishlist(id, updateWishlistDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Danh sách mong muốn đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async deleteWishlist(@Param('id') id: string): Promise<void> {
    return await this.wishlistService.deleteWishlist(id);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Xóa một mục khỏi danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Mục đã được xóa khỏi danh sách mong muốn thành công' })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn hoặc mục không tồn tại' })
  async deleteWishlistItem(@Param('id') id: string, @Param('itemId') itemId: string): Promise<void> {
    return await this.wishlistService.deleteWishlistItem(id, itemId);
  }
}