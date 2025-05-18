import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { FindAllRefundsDto } from './dto/find-all-refunds.dto';
import { Refund } from './entities/refund.entity';

@ApiTags('Refunds')
@ApiBearerAuth('access-token')
@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một hoàn trả' })
  @ApiResponse({ status: 201, description: 'Hoàn trả đã được tạo thành công', type: Refund })
  async create(@Body() createRefundDto: CreateRefundDto): Promise<Refund> {
    return await this.refundService.create(createRefundDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả hoàn trả' })
  @ApiResponse({ status: 200, description: 'Danh sách hoàn trả', type: [Refund] })
  async findAll(@Query() query: FindAllRefundsDto): Promise<Refund[]> {
    return await this.refundService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hoàn trả theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết hoàn trả', type: Refund })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hoàn trả' })
  async findOne(@Param('id') id: string): Promise<Refund> {
    return await this.refundService.findOne(id);
  }

  // @Post('/refund/:paymentId')
  // @ApiOperation({ summary: 'Refund a payment' })
  // @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  // @ApiResponse({ status: 404, description: 'Payment not found' })
  // @ApiResponse({ status: 400, description: 'Invalid refund request' })
  // @ApiResponse({ status: 500, description: 'Internal server error' })
  // async refundPayment(
  //   @Param('paymentId') paymentId: string,
  //   @Body() createRefundDto: CreateRefundDto,
  // ) {
  //   const result = await this.refundService.refundPayment(paymentId, createRefundDto);
  //   return {
  //     message: result.message,
  //     refundId: result.data.refundId,
  //     amount: result.data.amount,
  //     date: result.data.date,
  //   };
  // }

}