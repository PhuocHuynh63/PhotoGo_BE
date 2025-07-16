import { Controller, Get, Param, Query, UseGuards, Post, Body, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AttendanceLogService } from './attendance-log.service';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';
import { CreateAttendanceLogDto } from './dto/attendance-log.dto';
import { AttendanceLog } from './entities/attendance-log.entity';
import { FindAllAttendanceLogDto } from './dto/find-all-attendance-log.dto';
import { Public, ResponseMessage } from 'src/decorator/custom';

@ApiTags('Attendance Logs')
@Controller('attendance-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AttendanceLogController {
  constructor(private readonly attendanceLogService: AttendanceLogService) { }

  @Public()
  @Post(':id')
  @ApiOperation({ summary: 'Create attendance log' })
  @ApiResponse({ status: 201, description: 'Ghi log điểm danh thành công' })
  @ApiResponse({ status: 400, description: 'Ghi log đã điểm danh' })
  async create(@Param('id') userId: String,@Body() dto: CreateAttendanceLogDto): Promise<AttendanceLog> {
    return this.attendanceLogService.createLog(userId, dto);
  }

  @Public()
  @Get()
  @ResponseMessage('Lấy danh sách log điểm danh thành công')
  @ApiOperation({ summary: 'Lấy ra dánh sách dựa trên filter Attendance Log' })
  async findAll(@Query() query: FindAllAttendanceLogDto): Promise<{
    data: AttendanceLog[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.attendanceLogService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance log by id' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AttendanceLog> {
    return this.attendanceLogService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update attendance log by id' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAttendanceLogDto>): Promise<AttendanceLog> {
    return this.attendanceLogService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attendance log by id' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.attendanceLogService.remove(id);
  }

  @Get('my-logs/:userId')
  @ApiOperation({ summary: 'Get current user attendance logs' })
  async getMyLogs(@Param() userId: string) {
    return this.attendanceLogService.getUserLogs(userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent attendance logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentLogs(@Query('limit') limit?: number) {
    return this.attendanceLogService.getRecentLogs(limit);
  }
}