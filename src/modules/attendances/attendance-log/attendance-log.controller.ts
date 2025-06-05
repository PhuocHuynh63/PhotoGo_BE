import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceLogService } from './attendance-log.service';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';

@ApiTags('Attendance Logs')
@Controller('attendance-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceLogController {
  constructor(private readonly attendanceLogService: AttendanceLogService) { }

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