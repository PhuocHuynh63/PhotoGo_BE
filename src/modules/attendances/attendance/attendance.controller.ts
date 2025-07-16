import { Controller, Post, Get, UseGuards, Request, Param, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/custom';
import { CurrentUserId } from 'src/decorator/user.decorator';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post('check-in/:userId')
  @ApiOperation({ summary: 'Daily check-in - Admin only or own user' })
  @ApiResponse({ status: 201, description: 'Điểm danh thành công' })
  @ApiResponse({ status: 400, description: 'Đã điểm danh' })
  @ApiResponse({ status: 403, description: 'Không có quyền điểm danh cho user khác' })
  async checkIn(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub;

    // Security check: User chỉ được điểm danh cho chính mình
    if (currentUserId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể điểm danh cho chính mình');
    }

    return this.attendanceService.checkIn(userId);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Daily check-in for current user' })
  @ApiResponse({ status: 201, description: 'Điểm danh thành công' })
  @ApiResponse({ status: 400, description: 'Đã điểm danh' })
  async checkInCurrentUser(@CurrentUserId() userId: string) {
    console.log('Current user checking in:', userId);
    return this.attendanceService.checkIn(userId);
  }

  @Get('history/:userId')
  @ApiResponse({ status: 200, description: 'Lấy lịch sử thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lịch sử điểm danh' })
  @ApiOperation({ summary: 'Get user attendance history - Own data only' })
  async getHistory(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub;

    // Security check: User chỉ được xem lịch sử của chính mình
    if (currentUserId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể xem lịch sử điểm danh của chính mình');
    }

    return this.attendanceService.getUserAttendance(userId);
  }

  @Get('has-attendance/:userId')
  @ApiOperation({ summary: 'Check if user has attended today - Own data only' })
  async checkAttendance(@Param('userId') userId: string, @Request() req: any) {
    const currentUserId = req.user?.userId || req.user?.sub;

    // Security check: User chỉ được check attendance của chính mình
    if (currentUserId !== userId) {
      throw new ForbiddenException('Bạn chỉ có thể kiểm tra điểm danh của chính mình');
    }

    const hasAttended = await this.attendanceService.hasCheckedInToday(userId);
    return { hasAttended };
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get current user streak' })
  async getStreak(@CurrentUserId() userId: string) {
    return this.attendanceService.getStreak(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get current user attendance history' })
  async getMyHistory(@CurrentUserId() userId: string) {
    return this.attendanceService.getUserAttendance(userId);
  }

  @Get('has-attendance')
  @ApiOperation({ summary: 'Check if current user has attended today' })
  async checkMyAttendance(@CurrentUserId() userId: string) {
    const hasAttended = await this.attendanceService.hasCheckedInToday(userId);
    return { hasAttended };
  }
}