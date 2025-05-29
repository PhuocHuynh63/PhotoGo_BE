import { Controller, Post, Get, Param, Body, Put, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { GetUser } from 'src/decorator/user.decorator';

@ApiTags('Carts')
@ApiBearerAuth('access-token')
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới giỏ hàng' })
  @ApiResponse({ status: 201, description: 'Giỏ hàng được tạo thành công', type: Cart })
  async createCart(@Body() createCartDto: CreateCartDto): Promise<Cart> {
    return await this.cartService.createCart(createCartDto);
  }

  @Post(':user_id/:cart_id/:service_concept_id/items')
  @ApiOperation({ summary: 'Thêm một mục vào giỏ hàng' })
  @ApiResponse({ status: 201, description: 'Mục được thêm vào giỏ hàng thành công', type: CartItem })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng' })
  async addCartItem(
    @Param('service_concept_id') serviceConceptId: string,
    @Param('cart_id') cartId: string,
    @Param('user_id') userId: string,
  ): Promise<CartItem> {
    return await this.cartService.addCartItem({ serviceConceptId, cartId, userId });
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Danh sách giỏ hàng', type: [Cart] })
  async findAllCarts(): Promise<Cart[]> {
    return await this.cartService.findAllCarts();
  }

  @Get('items/:cartId')
  @ApiOperation({ summary: 'Lấy tất cả mục trong giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Danh sách mục giỏ hàng', type: [CartItem] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng' })
  async findCartItems(@Param('cartId') cartId: string): Promise<CartItem[]> {
    return await this.cartService.findCartItems(cartId);
  }

  @Get(':userId/items')
  @ApiOperation({ summary: 'Lấy tất cả mục trong giỏ hàng theo ID người dùng' })
  @ApiResponse({ status: 200, description: 'Danh sách mục giỏ hàng', type: [CartItem] })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng' })
  async findCartItemsByUserId(@Param('userId') userId: string): Promise<CartItem[]> {
    return await this.cartService.findCartItemsByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết giỏ hàng theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết giỏ hàng', type: Cart })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng' })
  async findCartById(@Param('id') id: string): Promise<Cart> {
    return await this.cartService.findCartById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật giỏ hàng theo ID' })
  @ApiResponse({ status: 200, description: 'Giỏ hàng được cập nhật thành công', type: Cart })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng' })
  async updateCart(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto): Promise<Cart> {
    return await this.cartService.updateCart(id, updateCartDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa giỏ hàng theo ID' })
  @ApiResponse({ status: 200, description: 'Giỏ hàng được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng' })
  async deleteCart(@Param('id') id: string): Promise<void> {
    return await this.cartService.removeCart(id);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Xóa mục khỏi giỏ hàng' })
  @ApiResponse({ status: 200, description: 'Mục được xóa khỏi giỏ hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giỏ hàng hoặc mục' })
  async removeCartItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    return await this.cartService.removeCartItem(cartId, itemId);
  }
}