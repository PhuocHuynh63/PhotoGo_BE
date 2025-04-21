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
  @ApiOperation({ summary: 'Create a new support ticket (Protected)' })
  @ApiResponse({ status: 201, description: 'Support ticket created successfully', type: SupportTicket })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createSupportTicketDto: CreateSupportTicketDto,
    @CurrentUser() user: User,
  ): Promise<SupportTicket> {
    return this.supportTicketService.create(createSupportTicketDto, user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all support tickets (Protected)' })
  @ApiResponse({
    status: 200,
    description: 'List of support tickets with pagination',
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
  @ApiOperation({ summary: 'Get a support ticket by ID (Protected)' })
  @ApiResponse({ status: 200, description: 'Support ticket found', type: SupportTicket })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string): Promise<SupportTicket> {
    return this.supportTicketService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a support ticket by ID' })
  @ApiResponse({ status: 200, description: 'Support ticket updated successfully', type: SupportTicket })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  async updateSupportTicket(@Param('id') id: string, @Body() updateSupportTicketDto: UpdateSupportTicketDto): Promise<SupportTicket> {
    return await this.supportTicketService.updateSupportTicket(id, updateSupportTicketDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a support ticket by ID' })
  @ApiResponse({ status: 200, description: 'Support ticket deleted successfully' })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  async deleteSupportTicket(@Param('id') id: string): Promise<void> {
    return await this.supportTicketService.deleteSupportTicket(id);
  }
}