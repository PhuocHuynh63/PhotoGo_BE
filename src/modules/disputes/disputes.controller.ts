import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { FindDisputeDto } from './dto/find-dispute.dto';
import { Dispute } from './entities/dispute.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateDisputeDto } from './dto/update-dispute.dto';

@ApiTags('Disputes')
@Controller('disputes')
@ApiBearerAuth('access-token')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo khiếu nại mới' })
  @ApiResponse({ status: 201, description: 'Khiếu nại đã được tạo thành công', type: Dispute })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createDisputeDto: CreateDisputeDto): Promise<Dispute> {
    return this.disputesService.create(createDisputeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khiếu nại' })
  @ApiResponse({ status: 200, description: 'Danh sách khiếu nại đã được lấy thành công', type: [Dispute] })
  async findAll(@Query() findDisputeDto: FindDisputeDto): Promise<{
    data: Dispute[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.disputesService.findAll(findDisputeDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin khiếu nại theo ID' })
  @ApiResponse({ status: 200, description: 'Khiếu nại đã được tìm thấy', type: Dispute })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khiếu nại' })
  async findOne(@Param('id') id: string): Promise<Dispute> {
    return this.disputesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật trạng thái khiếu nại' })
  @ApiResponse({ status: 200, description: 'Khiếu nại đã được cập nhật thành công', type: Dispute })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khiếu nại' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async update(
    @Param('id') id: string,
    @Body() updateDisputeDto: UpdateDisputeDto,
  ): Promise<Dispute> {
    return this.disputesService.update(id, updateDisputeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khiếu nại' })
  @ApiResponse({ status: 200, description: 'Khiếu nại đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khiếu nại' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.disputesService.remove(id);
  }
} 