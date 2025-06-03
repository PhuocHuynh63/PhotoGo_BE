import { Controller, Post, Get, Param, Query, Body, Put, Delete, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { Payment } from './entities/payment.entity';
import { PayOSWebhookDto } from './dto/payos-webhook.dto';
import { PaymentType } from '../../constants/payment.enum';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/passport/roles.guard';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ResponseMessage } from 'src/decorator/custom';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một thanh toán' })
  @ApiResponse({ status: 201, description: 'Thanh toán được tạo thành công', type: Payment })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ResponseMessage('Tạo thanh toán thành công')
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      return await this.paymentService.create(createPaymentDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo thanh toán', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả thanh toán' })
  @ApiResponse({ status: 200, description: 'Danh sách thanh toán', type: [Payment] })
  @ApiResponse({ status: 400, description: 'Tham số tìm kiếm không hợp lệ' })
  @ResponseMessage('Lấy danh sách thanh toán thành công')
  async findAll(@Query() query: FindAllPaymentsDto): Promise<Payment[]> {
    try {
      return await this.paymentService.findAll(query);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách thanh toán', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin thanh toán theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin thanh toán', type: Payment })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  @ResponseMessage('Lấy thông tin thanh toán thành công')
  async findOne(@Param('id') id: string): Promise<Payment> {
    if (!id) {
      throw new HttpException('ID thanh toán không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.paymentService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy thông tin thanh toán', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin thanh toán' })
  @ApiResponse({ status: 200, description: 'Thanh toán được cập nhật thành công', type: Payment })
  @ApiResponse({ status: 400, description: 'Dữ liệu cập nhật không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  @ResponseMessage('Cập nhật thanh toán thành công')
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    if (!id) {
      throw new HttpException('ID thanh toán không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.paymentService.update(id, updatePaymentDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi cập nhật thanh toán', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thanh toán' })
  @ApiResponse({ status: 200, description: 'Thanh toán được xóa thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  @ResponseMessage('Xóa thanh toán thành công')
  async remove(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new HttpException('ID thanh toán không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.paymentService.remove(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xóa thanh toán', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/:invoiceId/payos/link')
  @ApiOperation({ summary: 'Tạo liên kết thanh toán PayOS' })
  @ApiResponse({ status: 201, description: 'Liên kết thanh toán được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Tạo liên kết thanh toán thành công')
  async createPayOSLink(
    @Param('invoiceId') invoiceId: string,
    @Body('type') type: PaymentType = PaymentType.DEPOSIT
  ): Promise<any> {
    if (!invoiceId) {
      throw new HttpException('ID hóa đơn không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.paymentService.createPayOSLink(invoiceId, type);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo liên kết thanh toán', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/webhook/payos')
  @ApiOperation({ summary: 'Xử lý webhook PayOS' })
  @ApiResponse({ status: 200, description: 'Webhook đã được xử lý thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu webhook không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thanh toán' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Xử lý webhook thành công')
  async handlePayOSWebhook(@Body() payload: PayOSWebhookDto): Promise<any> {
    if (!payload || !payload.transactionId) {
      throw new HttpException('Dữ liệu webhook không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.paymentService.handlePayOSWebhook(payload);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xử lý webhook', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/invoice/:invoiceId')
  @ApiOperation({ summary: 'Lấy danh sách thanh toán của hóa đơn' })
  @ApiResponse({ status: 200, description: 'Danh sách thanh toán của hóa đơn', type: [Payment] })
  @ApiResponse({ status: 400, description: 'ID hóa đơn không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ResponseMessage('Lấy danh sách thanh toán của hóa đơn thành công')
  async getPaymentsByInvoice(@Param('invoiceId') invoiceId: string): Promise<Payment[]> {
    if (!invoiceId) {
      throw new HttpException('ID hóa đơn không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.paymentService.findAll({ invoiceId });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách thanh toán của hóa đơn', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}