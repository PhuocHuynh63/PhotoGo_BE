import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Daily check-in' })
  @ApiResponse({ status: 201, description: 'Successfully checked in' })
  @ApiResponse({ status: 400, description: 'Already checked in today' })
  async checkIn(@Request() req) {
    return this.attendanceService.checkIn(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user attendance history' })
  async getHistory(@Request() req) {
    return this.attendanceService.getUserAttendance(req.user.id);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get current streak' })
  async getStreak(@Request() req) {
    return {
      streak: await this.attendanceService.getStreak(req.user.id)
    };
  }
}