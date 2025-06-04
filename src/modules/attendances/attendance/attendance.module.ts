import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance } from './entity/attendance.entity';
import { UserModule } from '../../users/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    UserModule, // For user-related operations
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService], // Export service if needed by other modules
})
export class AttendanceModule {}