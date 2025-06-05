import { Controller, Post, Get, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/custom';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Public()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post('check-in/:userId')
  @ApiOperation({ summary: 'Daily check-in' })
  @ApiResponse({ status: 201, description: 'Điểm danh thành công' })
  @ApiResponse({ status: 400, description: 'Đã điểm danh' })
  async checkIn(@Param('userId') userId: string) {
    return this.attendanceService.checkIn(userId);
  }

  @Get('history/:userId')
  @ApiResponse({ status: 200, description: 'Lấy lịch sử thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch sử điểm danh' })
  @ApiOperation({ summary: 'Get user attendance history' })
  async getHistory(@Param('userId') userId: string) {
    return this.attendanceService.getUserAttendance(userId);
  }

  @Get('has-attendance/:userId')
  @ApiOperation({ summary: 'Check if user has attended today' })
  async checkAttendance(@Param('userId') userId: string) {
    const hasAttended = await this.attendanceService.hasCheckedInToday(userId);
    return { hasAttended };
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get current streak' })
  async getStreak(@Request() req) {
    return {
      streak: await this.attendanceService.getStreak(req.user.id)
    };
  }
}