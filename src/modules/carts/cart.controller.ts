import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';

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

  @Post('items')
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully', type: CartItem })
  async addCartItem(@Body() addCartItemDto: AddCartItemDto): Promise<CartItem> {
    return await this.cartService.addCartItem(addCartItemDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a cart by ID' })
  @ApiResponse({ status: 200, description: 'Cart details', type: Cart })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async findCartById(@Param('id') id: string): Promise<Cart> {
    return await this.cartService.findCartById(id);
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
}