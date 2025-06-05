import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AttendanceLogsService } from './attendance-logs.service';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from '../../decorator/role.decorator';
import { Public } from 'src/decorator/custom';

@Controller('attendance-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceLogsController {
  constructor(private readonly attendanceLogsService: AttendanceLogsService) {}

  @Get('user/:userId')
  @Public()
  async getUserLogs(@Param('userId') userId: number) {
    return await this.attendanceLogsService.getUserLogs(userId);
  }

  @Get('user/:userId/range')
  @Public()
  async getLogsByDateRange(
    @Param('userId') userId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.attendanceLogsService.getLogsByDateRange(
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('user/:userId/points')
  @Public()
  async getTotalPoints(@Param('userId') userId: number) {
    return await this.attendanceLogsService.getTotalPoints(userId);
  }
} 