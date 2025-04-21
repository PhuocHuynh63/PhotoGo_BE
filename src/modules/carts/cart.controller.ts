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
  @ApiOperation({ summary: 'Create a new cart' })
  @ApiResponse({ status: 201, description: 'Cart created successfully', type: Cart })
  async createCart(@Body() createCartDto: CreateCartDto): Promise<Cart> {
    return await this.cartService.createCart(createCartDto);
  }

  @Post(':user_id/:cart_id/:service_package_id/items')
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully', type: CartItem })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async addCartItem(
    @Param('service_package_id') servicePackageId: string,
    @Param('cart_id') cartId: string,
    @Param('user_id') userId: string,
  ): Promise<CartItem> {
    return await this.cartService.addCartItem({ servicePackageId, cartId, userId });
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all carts' })
  @ApiResponse({ status: 200, description: 'List of carts', type: [Cart] })
  async findAllCarts(): Promise<Cart[]> {
    return await this.cartService.findAllCarts();
  }

  @Get('items/:cartId')
  @ApiOperation({ summary: 'Retrieve all items in a cart' })
  @ApiResponse({ status: 200, description: 'List of cart items', type: [CartItem] })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async findCartItems(@Param('cartId') cartId: string): Promise<CartItem[]> {
    return await this.cartService.findCartItems(cartId);
  }

  @Get(':userId/items')
  @ApiOperation({ summary: 'Retrieve all items in a cart by user ID' })
  @ApiResponse({ status: 200, description: 'List of cart items', type: [CartItem] })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async findCartItemsByUserId(@Param('userId') userId: string): Promise<CartItem[]> {
    return await this.cartService.findCartItemsByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a cart by ID' })
  @ApiResponse({ status: 200, description: 'Cart details', type: Cart })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async findCartById(@Param('id') id: string): Promise<Cart> {
    return await this.cartService.findCartById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a cart by ID' })
  @ApiResponse({ status: 200, description: 'Cart updated successfully', type: Cart })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async updateCart(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto): Promise<Cart> {
    return await this.cartService.updateCart(id, updateCartDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cart by ID' })
  @ApiResponse({ status: 200, description: 'Cart deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async deleteCart(@Param('id') id: string): Promise<void> {
    return await this.cartService.removeCart(id);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  async removeCartItem(
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    return await this.cartService.removeCartItem(cartId, itemId);
  }
}