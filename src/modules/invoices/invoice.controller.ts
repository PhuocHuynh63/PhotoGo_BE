import { Controller, Post, Get, Put, Delete, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { FindAllInvoicesDto } from './dto/find-all.dto';
import { Invoice } from './entities/invoice.entity';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ResponseMessage } from 'src/decorator/custom';
import { FilterInvoiceByUserIdDto, PaginationInvoiceDto } from './dto/filter-invoice.dto';
import { Public } from 'src/decorator/custom';
import { MailService } from 'src/3rdService/mail/mail.service';

@Controller('invoices')
@ApiTags('Invoice')
@ApiBearerAuth('access-token')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly mailService: MailService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn mới' })
  @ApiResponse({ status: 201, description: 'Hóa đơn được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng hoặc voucher' })
  @ApiResponse({ status: 409, description: 'Voucher không hợp lệ hoặc đã được sử dụng' })
  @ApiQuery({ name: 'bookingId', required: true, description: 'Booking ID' })
  @ApiQuery({ name: 'voucherId', required: false, description: 'Voucher ID (optional)' })
  @ResponseMessage('Tạo hóa đơn thành công')
  async create(
    @Query('bookingId') bookingId: string,
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Query('voucherId') voucherId?: string
  ) {
    if (!bookingId) {
      throw new HttpException('ID đơn hàng không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.invoiceService.create(bookingId, voucherId, createInvoiceDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo hóa đơn', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả hóa đơn' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả hóa đơn', type: [CreateInvoiceDto] })
  @ApiResponse({ status: 400, description: 'Tham số tìm kiếm không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ResponseMessage('Lấy danh sách hóa đơn thành công')
  @ApiQuery({ name: 'current', required: false, description: 'Số trang hiện tại' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Số lượng item trên mỗi trang' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Trường sắp xếp' })
  @ApiQuery({ name: 'sortDirection', required: false, description: 'Hướng sắp xếp' })
  async findAll(@Query() paginationDto: PaginationInvoiceDto): Promise<{
    data: Invoice[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      return await this.invoiceService.findAll(paginationDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách hóa đơn', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn của user' })
  @ApiResponse({ status: 200, description: 'Danh sách hóa đơn của user', type: [CreateInvoiceDto] })
  @ApiResponse({ status: 400, description: 'Tham số tìm kiếm không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ResponseMessage('Lấy danh sách hóa đơn của user thành công')
  async findAllByUserId(@Param('userId') userId: string, @Query() paginationDto: FilterInvoiceByUserIdDto): Promise<{
    data: Invoice[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    try {
      return await this.invoiceService.findAllByUserId(userId, paginationDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách hóa đơn của user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('test-invoice-mail')
  @Public()
  async testInvoiceMail(@Query('email') email: string, @Query('invoiceId') invoiceId: string) {
    const invoice = await this.invoiceService.findOne(invoiceId);
    await this.mailService.sendMail(
      email,
      'Hóa đơn thanh toán của bạn',
      'invoice',
      { invoice }
    );
    return { message: 'Đã gửi email invoice!' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hóa đơn theo ID' })
  @ApiResponse({ status: 200, description: 'Hóa đơn được tìm thấy', type: CreateInvoiceDto })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ResponseMessage('Lấy thông tin hóa đơn thành công')
  async findOne(@Param('id') id: string) {
    if (!id) {
      throw new HttpException('ID hóa đơn không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.invoiceService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy thông tin hóa đơn', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn theo ID' })
  @ApiResponse({ status: 200, description: 'Hóa đơn được cập nhật thành công', type: UpdateInvoiceDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu cập nhật không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ResponseMessage('Cập nhật hóa đơn thành công')
  async updateInvoice(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    if (!id) {
      throw new HttpException('ID hóa đơn không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.invoiceService.updateInvoice(id, updateInvoiceDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi cập nhật hóa đơn', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hóa đơn theo ID' })
  @ApiResponse({ status: 200, description: 'Hóa đơn được xóa thành công' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hóa đơn' })
  @ApiResponse({ status: 409, description: 'Không thể xóa hóa đơn đã thanh toán' })
  @ResponseMessage('Xóa hóa đơn thành công')
  async deleteInvoice(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new HttpException('ID hóa đơn không được để trống', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.invoiceService.deleteInvoice(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xóa hóa đơn', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }


}