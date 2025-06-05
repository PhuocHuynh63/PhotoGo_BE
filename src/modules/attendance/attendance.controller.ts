import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from '../../decorator/role.decorator';
import { Role } from '../roles/entities/role.entity';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles({ id: 'R001', name: 'user' } as Role)
  async checkIn(@Body('userId') userId: number) {
    const today = new Date();
    return await this.attendanceService.create(userId, today);
  }

  @Get('history/:userId')
  @Roles({ id: 'R001', name: 'user' } as Role)
  async getAttendanceHistory(@Param('userId') userId: number) {
    return await this.attendanceService.getUserAttendanceHistory(userId);
  }

  @Get('today/:userId')
  @Roles({ id: 'R001', name: 'user' } as Role)
  async getTodayAttendance(@Param('userId') userId: number) {
    const today = new Date();
    return await this.attendanceService.findByUserIdAndDate(userId, today);
  }
} 