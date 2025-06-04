import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceLogService } from './attendance-log.service';
import { AttendanceLogController } from './attendance-log.controller';
import { AttendanceLog } from './entity/attendance-log.entity';
import { UserModule } from '../../users/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceLog]),
    UserModule,
  ],
  controllers: [AttendanceLogController],
  providers: [AttendanceLogService],
  exports: [AttendanceLogService],
})
export class AttendanceLogModule {}