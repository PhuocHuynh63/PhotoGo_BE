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
  @ApiOperation({ summary: 'Tạo một mã giảm giá mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Mã giảm giá đã được tạo thành công', type: Voucher })
  @ApiResponse({ status: 401, description: 'Không được phép' })
  async createVoucher(@Body() createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    return this.voucherService.createVoucher(createVoucherDto);
  }

  @Public()
  @Get('user')
  @ApiOperation({ summary: 'Lấy tất cả các bản ghi voucher-user (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các bản ghi voucher-user với phân trang',
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
  @Get('user/:userId')
  @ApiOperation({ summary: 'Tất cả voucher của user (Public)' })
  @ApiResponse({ status: 200, description: 'VoucherUser đã được tìm thấy', type: VoucherUser })
  @ApiResponse({ status: 404, description: 'VoucherUser không tồn tại' })
  async findAllVoucherUser(@Param('userId') userId: string, @Query() query: FindVoucherUserDto): Promise<{
    data: any[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.voucherService.findAllVoucherUser(userId, query);
  }

  // @Public()
  // @Get('user/:userId/campaign')
  // @ApiOperation({ summary: 'Voucher của user từ campaign' })
  // @ApiResponse({ status: 200, description: 'Mã giảm giá lấy từ chiến dịch', type: VoucherUser })
  // @ApiResponse({ status: 404, description: 'Mã giảm giá không tồn tại' })
  // async findVoucherByCampaign(@Param('userId') userId: string, @Query() query: FindVoucherDto): Promise<{
  //   data: any[];
  //   pagination: {
  //     current: number;
  //     pageSize: number;
  //     totalPage: number;
  //     totalItem: number;
  //   };
  // }> {
  //   return this.voucherService.findVoucherByCampaign(userId, query);
  // }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả các mã giảm giá (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các mã giảm giá với phân trang',
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
  @ApiOperation({ summary: 'Lấy một mã giảm giá bằng ID (Public)' })
  @ApiResponse({ status: 200, description: 'Mã giảm giá đã được tìm thấy', type: Voucher })
  @ApiResponse({ status: 404, description: 'Mã giảm giá không tồn tại' })
  async findOneVoucher(@Param('id') id: string): Promise<Voucher> {
    return this.voucherService.findOneVoucher(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật một mã giảm giá bằng ID' })
  @ApiResponse({ status: 200, description: 'Mã giảm giá đã được cập nhật thành công', type: Voucher })
  @ApiResponse({ status: 404, description: 'Mã giảm giá không tồn tại' })
  async updateVoucher(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto): Promise<Voucher> {
    return await this.voucherService.updateVoucher(id, updateVoucherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một mã giảm giá bằng ID' })
  @ApiResponse({ status: 200, description: 'Mã giảm giá đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Mã giảm giá không tồn tại' })
  async deleteVoucher(@Param('id') id: string): Promise<void> {
    return await this.voucherService.deleteVoucher(id);
  }
  //#endregion Voucher Endpoints

  //#region VoucherUser Endpoints
  @Post('user')
  @ApiOperation({ summary: 'Gán một mã giảm giá cho một người dùng (Protected)' })
  @ApiResponse({ status: 201, description: 'Mã giảm giá đã được gán thành công', type: VoucherUser })
  @ApiResponse({ status: 401, description: 'Không được phép' })
  async createVoucherUser(@Query ('userId') userId: string, @Query('voucherId') voucherId: string,
                          @Body() createVoucherUserDto: CreateVoucherUserDto): Promise<VoucherUser> {
    return this.voucherService.createVoucherUser(userId,voucherId,createVoucherUserDto);
  }

  @Post('user/:voucherId/:userId/use')
  @ApiOperation({ summary: 'Sử dụng một mã giảm giá cho một người dùng (Protected)' })
  @ApiResponse({ status: 200, description: 'Mã giảm giá đã được sử dụng thành công', type: VoucherUser })
  @ApiResponse({ status: 400, description: 'Mã giảm giá không hợp lệ hoặc đã được sử dụng' })
  async useVoucher(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<VoucherUser> {
    return this.voucherService.useVoucher(voucherId, userId);
  }

  @Post('user/:userId/exchange/:voucherId')
  @Public()
  @ApiOperation({ summary: 'User đổi điểm lấy voucher' })
  @ApiResponse({ status: 201, description: 'Đổi điểm lấy voucher thành công', type: VoucherUser })
  @ApiResponse({ status: 400, description: 'Không đủ điểm hoặc điều kiện không hợp lệ' })
  async exchangeVoucherByPoint(@Param('userId') userId: string, @Param('voucherId') voucherId: string): Promise<VoucherUser> {
    return this.voucherService.exchangeVoucherByPoint(userId, voucherId);
  }

  @Delete('user/:voucherId/:userId')
  @ApiOperation({ summary: 'Xóa bản ghi voucher-user bằng voucherId và userId (Protected)' })
  @ApiResponse({ status: 200, description: 'Bản ghi voucher-user đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Bản ghi voucher-user không tồn tại' })
  async deleteVoucherUser(@Param('voucherId') voucherId: string, @Param('userId') userId: string): Promise<void> {
    return this.voucherService.deleteVoucherUser(voucherId, userId);
  }
  
  //#endregion VoucherUser Endpoints
}