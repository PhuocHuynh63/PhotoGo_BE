import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { UserModule } from '../../users/user.module';
import { PointModule } from '../../points/point.module';
import { Attendance } from './entities/attendance.entity';
import { NotificationModule } from '../../notifications/notification.module';
import { JwtAuthGuard } from 'src/modules/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/passport/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance]),
    UserModule, // For user-related operations
    PointModule, // For point-related operations
    forwardRef(() => NotificationModule), // For notification when check-in
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, RolesGuard, JwtAuthGuard],
  exports: [AttendanceService], // Export service if needed by other modules
})
export class AttendanceModule { }