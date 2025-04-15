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
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new refund' })
  @ApiResponse({ status: 201, description: 'Refund created successfully', type: Refund })
  async create(@Body() createRefundDto: CreateRefundDto): Promise<Refund> {
    return await this.refundService.create(createRefundDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all refunds' })
  @ApiResponse({ status: 200, description: 'List of refunds', type: [Refund] })
  async findAll(@Query() query: FindAllRefundsDto): Promise<Refund[]> {
    return await this.refundService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a refund by ID' })
  @ApiResponse({ status: 200, description: 'Refund details', type: Refund })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  async findOne(@Param('id') id: string): Promise<Refund> {
    return await this.refundService.findOne(id);
  }
}