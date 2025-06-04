import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AttendanceLogService } from './attendance-log.service';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Attendance Logs')
@Controller('attendance-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceLogController {
  constructor(private readonly attendanceLogService: AttendanceLogService) {}

  @Get('my-logs')
  @ApiOperation({ summary: 'Get current user attendance logs' })
  async getMyLogs(@GetUser('id') userId: string) {
    return this.attendanceLogService.getUserLogs(userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent attendance logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentLogs(@Query('limit') limit?: number) {
    return this.attendanceLogService.getRecentLogs(limit);
  }
}