import { Controller, Post, Get, Put, Delete, Param, Body, Query, ValidationPipe, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { PaginationDto } from './dto/pagination.dto';
import { Public } from 'src/decorator/custom';

@ApiTags('Wishlists')
@ApiBearerAuth('access-token')
@Controller('wishlists')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post('items')
  @ApiOperation({ summary: 'Thêm một mục vào danh sách mong muốn' })
  @ApiResponse({ status: 201, description: 'Mục đã được thêm vào danh sách mong muốn thành công', type: WishlistItem })
  async addWishlistItem(@Body(ValidationPipe) addWishlistItemDto: AddWishlistItemDto): Promise<WishlistItem> {
    return await this.wishlistService.addWishlistItem(addWishlistItemDto);
  }

  @Post(':user_id')
  @ApiOperation({ summary: 'Tạo danh sách mong muốn mới' })
  @ApiResponse({ status: 201, description: 'Danh sách mong muốn đã được tạo thành công', type: Wishlist })
  async createWishlist(@Param('user_id') userId: string): Promise<Wishlist> {
    return await this.wishlistService.createWishlist(userId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả danh sách mong muốn' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách tất cả danh sách mong muốn', 
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Wishlist' }
        },
        pagination: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            pageSize: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async findAllWishlists(@Query() paginationDto: PaginationDto): Promise<{
    data: {
      id: string;
      items: {
        id: string;
        wishlistId: string;
        serviceConceptId: string;
        serviceConcept: {
          id: string;
          servicePackageId: string;
          name: string;
          description: string;
          images: string[];
          price: number;
          duration: number;
          status: string;
          createdAt: Date;
          updatedAt: Date;
        } | null;
      }[];
    }[];
    pagination: {
      current: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    return await this.wishlistService.findAllWishlists(paginationDto);
  }

  @Get(':userId')
  @Public()
  @ApiOperation({ summary: 'Tìm danh sách mong muốn theo userId' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách mong muốn của người dùng', 
    type: Wishlist 
  })
  async findWishlistByUser(
    @Param('userId') userId: string, 
    @Query() paginationDto: PaginationDto
  ): Promise<{
    data: {
      id: string;
      items: {
        id: string;
        wishlistId: string;
        serviceConceptId: string;
        serviceConcept: {
          id: string;
          servicePackageId: string;
          name: string;
          description: string;
          images: string[];
          price: number;
          duration: number;
          status: string;
          createdAt: Date;
          updatedAt: Date;
        } | null;
      }[];
    }[];
    pagination: {
      current: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      return await this.wishlistService.findWishlistByUser(userId, paginationDto);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Danh sách mong muốn đã được cập nhật thành công', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async updateWishlist(
    @Param('id') id: string, 
    @Body(ValidationPipe) updateWishlistDto: UpdateWishlistDto
  ): Promise<Wishlist> {
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

  @Get(':id/items')
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả các mục trong danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả các mục trong danh sách mong muốn', type: [WishlistItem] })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async findWishlistItems(@Param('id') id: string): Promise<WishlistItem[]> {
    const wishlist = await this.wishlistService.findWishlistById(id);
    return wishlist.items;
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy chi tiết của danh sách mong muốn' })
  @ApiResponse({ status: 200, description: 'Chi tiết của danh sách mong muốn', type: Wishlist })
  @ApiResponse({ status: 404, description: 'Danh sách mong muốn không tồn tại' })
  async findWishlistById(@Param('id') id: string): Promise<Wishlist> {
    return await this.wishlistService.findWishlistById(id);
  }
}