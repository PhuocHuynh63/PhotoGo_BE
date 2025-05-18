import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { SupportTicketService } from './support_tickets.service';
import { CreateSupportTicketDto } from './dto/create-support_ticket.dto';
import { FindSupportTicketDto } from './dto/FindSupportTicketDto';
import { UpdateSupportTicketDto } from './dto/update-support_ticket.dto';
import { SupportTicket } from './entities/support_ticket.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../decorator/user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Support Tickets')
@Controller('support-tickets')
@ApiBearerAuth('access-token')
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Tạo vé hỗ trợ mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Vé hỗ trợ đã được tạo thành công', type: SupportTicket })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  async create(
    @Body() createSupportTicketDto: CreateSupportTicketDto,
    @CurrentUser() user: User,
  ): Promise<SupportTicket> {
    return this.supportTicketService.create(createSupportTicketDto, user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy tất cả vé hỗ trợ (Protected)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách vé hỗ trợ với phân trang',
    type: [SupportTicket],
  })
  async findAll(@Query() query: FindSupportTicketDto): Promise<{
    data: SupportTicket[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.supportTicketService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lấy vé hỗ trợ theo ID (Protected)' })
  @ApiResponse({ status: 200, description: 'Vé hỗ trợ đã được tìm thấy', type: SupportTicket })
  @ApiResponse({ status: 404, description: 'Vé hỗ trợ không tồn tại' })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  async findOne(@Param('id') id: string): Promise<SupportTicket> {
    return this.supportTicketService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật vé hỗ trợ theo ID' })
  @ApiResponse({ status: 200, description: 'Vé hỗ trợ đã được cập nhật thành công', type: SupportTicket })
  @ApiResponse({ status: 404, description: 'Vé hỗ trợ không tồn tại' })
  async updateSupportTicket(@Param('id') id: string, @Body() updateSupportTicketDto: UpdateSupportTicketDto): Promise<SupportTicket> {
    return await this.supportTicketService.updateSupportTicket(id, updateSupportTicketDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vé hỗ trợ theo ID' })
  @ApiResponse({ status: 200, description: 'Vé hỗ trợ đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Vé hỗ trợ không tồn tại' })
  async deleteSupportTicket(@Param('id') id: string): Promise<void> {
    return await this.supportTicketService.deleteSupportTicket(id);
  }
}