import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { VoucherUserService } from './voucher-user.service';
import { CreateVoucherUserDto } from './dto/create-voucher-user.dto';
import { VoucherUser } from './entities/voucher-user.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindVoucherUserDto } from './dto/find-voucher-user.dto';

@ApiTags('voucher-user')
@Controller('voucher-user')
@ApiBearerAuth('access-token')
export class VoucherUserController {
  constructor(private readonly voucherUserService: VoucherUserService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a voucher to a user (Protected)' })
  @ApiResponse({ status: 201, description: 'Voucher assigned successfully', type: VoucherUser })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createVoucherUserDto: CreateVoucherUserDto): Promise<VoucherUser> {
    return this.voucherUserService.create(createVoucherUserDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all voucher-user mappings (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of voucher-user mappings with pagination',
    type: [VoucherUser],
  })
  async findAll(@Query() query: FindVoucherUserDto): Promise<{
    data: VoucherUser[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.voucherUserService.findAll(query);
  }

  @Public()
  @Get(':voucherId/:userId')
  @ApiOperation({ summary: 'Get a voucher-user mapping by voucherId and userId (Public)' })
  @ApiResponse({ status: 200, description: 'VoucherUser found', type: VoucherUser })
  @ApiResponse({ status: 404, description: 'VoucherUser not found' })
  async findOne(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<VoucherUser> {
    return this.voucherUserService.findOne(voucherId, userId);
  }

  @Post(':voucherId/:userId/use')
  @ApiOperation({ summary: 'Use a voucher for a user (Protected)' })
  @ApiResponse({ status: 200, description: 'Voucher used successfully', type: VoucherUser })
  @ApiResponse({ status: 400, description: 'Voucher is not valid or has been used' })
  async useVoucher(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<VoucherUser> {
    return this.voucherUserService.useVoucher(voucherId, userId);
  }
}