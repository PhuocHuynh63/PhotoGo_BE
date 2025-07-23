import { Controller, Post, Get, Param, Body, Put, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentTransactionService } from './payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Public } from '../../decorator/custom';
import { FindAllPaymentTransactionsDto } from './dto/find-all-payments.dto';

@ApiTags('Payment Transactions')
@Controller('payment-transactions')
@ApiBearerAuth('access-token')
export class PaymentTransactionController {
  constructor(private readonly paymentTransactionService: PaymentTransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới lịch sử giao dịch' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: PaymentTransaction })
  async create(@Body() createDto: CreatePaymentTransactionDto): Promise<PaymentTransaction> {
    try {
      return await this.paymentTransactionService.create(createDto);
    } catch (error) {
      throw new HttpException('Lỗi khi tạo lịch sử giao dịch', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả lịch sử giao dịch' })
  @ApiResponse({ status: 200, description: 'Danh sách lịch sử giao dịch', schema: { example: {
    data: [],
    pagination: { current: 1, pageSize: 10, totalPage: 1, totalItem: 0 },
    revenueStatistics: { year: 2024, total: 10000000, monthly: [1000000, 900000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  } } })
  async findAll(
    @Query() findAllPaymentTransactionsDto: FindAllPaymentTransactionsDto,
    @Query('withStatistics') withStatistics?: string,
    @Query('year') year?: number
  ): Promise<any> {
    const result = await this.paymentTransactionService.findAll(findAllPaymentTransactionsDto);
    if (withStatistics === 'true') {
      (result as any).revenueStatistics = await this.paymentTransactionService.getRevenueStatistics(year ? +year : undefined);
    }
    return result;
  }

  @Get('revenue-statistics')
  @ApiOperation({ summary: 'Thống kê doanh thu (tổng và theo tháng)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Thống kê doanh thu', 
    schema: { 
      example: { 
        year: 2024, 
        total: 10000000, 
        monthly: [1000000, 900000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] 
      } 
    } 
  })
  async getRevenueStatistics(@Query('year') year?: number) {
    return this.paymentTransactionService.getRevenueStatistics(year ? +year : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết lịch sử giao dịch' })
  @ApiResponse({ status: 200, description: 'Chi tiết lịch sử giao dịch', type: PaymentTransaction })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async findOne(@Param('id') id: string): Promise<PaymentTransaction> {
    return this.paymentTransactionService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật lịch sử giao dịch' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: PaymentTransaction })
  async update(@Param('id') id: string, @Body() updateDto: UpdatePaymentTransactionDto): Promise<PaymentTransaction> {
    return this.paymentTransactionService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lịch sử giao dịch' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.paymentTransactionService.remove(id);
  }
} 