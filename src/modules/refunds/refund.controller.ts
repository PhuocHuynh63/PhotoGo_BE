import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RefundService } from './refund.service';
import { CreateRefundDto, ManualRefundDto } from './dto/create-refund.dto';
import { FindAllRefundsDto } from './dto/find-all-refunds.dto';
import { Refund } from './entities/refund.entity';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from '../../decorator/role.decorator';
import { Role } from 'src/modules/roles/entities/role.entity';
import { ResponseMessage } from '../../decorator/custom';
import { User } from '../users/entities/user.entity';

@ApiTags('Refunds')
@ApiBearerAuth('access-token')
@Controller('refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn trả' })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu hoàn trả thành công' })
  @ResponseMessage('Tạo yêu cầu hoàn trả thành công')
  async create(@Body() createRefundDto: CreateRefundDto): Promise<Refund> {
    return this.refundService.create(createRefundDto);
  }

  @Get('pending')
  @Roles({ id: 'R001' } as Role)
  @ApiOperation({ summary: 'Lấy danh sách refund đang chờ xử lý (Admin only)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ResponseMessage('Lấy danh sách refund pending thành công')
  async getPendingRefunds(): Promise<Refund[]> {
    return this.refundService.getPendingRefunds();
  }

  // @Post(':id/process-manual')
  // @Roles({ id: 'R005' } as Role)
  // @ApiOperation({ summary: 'Xử lý refund thủ công (Admin only)' })
  // @ApiResponse({ status: 200, description: 'Xử lý refund thành công' })
  // @ResponseMessage('Xử lý refund thành công')
  // async processManualRefund(
  //   @Param('id') id: string,
  //   @Body() manualRefundDto: ManualRefundDto,
  //   @User('id') user: string
  // ): Promise<Refund> {
  //   return this.refundService.processManualRefund(id, manualRefundDto, user.id);
  // }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả refund' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ResponseMessage('Lấy danh sách refund thành công')
  async findAll(@Query() query: FindAllRefundsDto): Promise<Refund[]> {
    return this.refundService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin refund theo ID' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ResponseMessage('Lấy thông tin refund thành công')
  async findOne(@Param('id') id: string): Promise<Refund> {
    return this.refundService.findOne(id);
  }

  @Post(':paymentId/refund-payment')
  @ApiOperation({ summary: 'Hoàn trả payment qua PayOS' })
  @ApiResponse({ status: 200, description: 'Hoàn trả thành công' })
  @ResponseMessage('Hoàn trả thành công')
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() createRefundDto: CreateRefundDto
  ): Promise<any> {
    return this.refundService.refundPayment(paymentId, createRefundDto);
  }
}