import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { CreateVoucherUserDto } from './dto/create-voucher.dto';
import { FindVoucherDto } from './dto/find-voucher.dto';
import { FindVoucherUserDto } from './dto/find-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { Voucher } from './entities/voucher.entity';
import { VoucherUser } from './entities/voucher-user.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Vouchers')
@Controller('vouchers')
@ApiBearerAuth('access-token')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  //#region Voucher Endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new voucher (Protected)' })
  @ApiResponse({ status: 201, description: 'Voucher created successfully', type: Voucher })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createVoucher(@Body() createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    return this.voucherService.createVoucher(createVoucherDto);
  }

  @Public()
  @Get('user')
  @ApiOperation({ summary: 'Get all voucher-user mappings (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of voucher-user mappings with pagination',
    type: [VoucherUser],
  })
  async findAllVoucherUsers(@Query() query: FindVoucherUserDto): Promise<{
    data: VoucherUser[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.voucherService.findAllVoucherUsers(query);
  }

  @Public()
  @Get('user/:voucherId/:userId')
  @ApiOperation({ summary: 'Get a voucher-user mapping by voucherId and userId (Public)' })
  @ApiResponse({ status: 200, description: 'VoucherUser found', type: VoucherUser })
  @ApiResponse({ status: 404, description: 'VoucherUser not found' })
  async findOneVoucherUser(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<VoucherUser> {
    return this.voucherService.findOneVoucherUser(voucherId, userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all vouchers (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of vouchers with pagination',
    type: [Voucher],
  })
  async findAllVouchers(@Query() query: FindVoucherDto): Promise<{
    data: Voucher[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.voucherService.findAllVouchers(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Voucher found', type: Voucher })
  @ApiResponse({ status: 404, description: 'Voucher not found' })
  async findOneVoucher(@Param('id') id: string): Promise<Voucher> {
    return this.voucherService.findOneVoucher(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a voucher by ID' })
  @ApiResponse({ status: 200, description: 'Voucher updated successfully', type: Voucher })
  @ApiResponse({ status: 404, description: 'Voucher not found' })
  async updateVoucher(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto): Promise<Voucher> {
    return await this.voucherService.updateVoucher(id, updateVoucherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a voucher by ID' })
  @ApiResponse({ status: 200, description: 'Voucher deleted successfully' })
  @ApiResponse({ status: 404, description: 'Voucher not found' })
  async deleteVoucher(@Param('id') id: string): Promise<void> {
    return await this.voucherService.deleteVoucher(id);
  }
  //#endregion Voucher Endpoints

  //#region VoucherUser Endpoints
  @Post('user')
  @ApiOperation({ summary: 'Assign a voucher to a user (Protected)' })
  @ApiResponse({ status: 201, description: 'Voucher assigned successfully', type: VoucherUser })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createVoucherUser(@Query ('userId') userId: string, @Query('voucherId') voucherId: string,
                          @Body() createVoucherUserDto: CreateVoucherUserDto): Promise<VoucherUser> {
    return this.voucherService.createVoucherUser(userId,voucherId,createVoucherUserDto);
  }

  @Post('user/:voucherId/:userId/use')
  @ApiOperation({ summary: 'Use a voucher for a user (Protected)' })
  @ApiResponse({ status: 200, description: 'Voucher used successfully', type: VoucherUser })
  @ApiResponse({ status: 400, description: 'Voucher is not valid or has been used' })
  async useVoucher(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<VoucherUser> {
    return this.voucherService.useVoucher(voucherId, userId);
  }

  @Delete('user/:voucherId/:userId')
  @ApiOperation({ summary: 'Delete a voucher-user mapping by voucherId and userId (Protected)' })
  @ApiResponse({ status: 200, description: 'VoucherUser deleted successfully' })
  @ApiResponse({ status: 404, description: 'VoucherUser not found' })
  async deleteVoucherUser(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<void> {
    return this.voucherService.deleteVoucherUser(voucherId, userId);
  }
  //#endregion VoucherUser Endpoints
}