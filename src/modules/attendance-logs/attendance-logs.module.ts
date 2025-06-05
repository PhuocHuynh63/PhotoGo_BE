import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AttendanceLogsService } from './attendance-logs.service';
import { AttendanceLogsController } from './attendance-logs.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceLog]),
    AuthModule
],
  controllers: [AttendanceLogsController],
  providers: [AttendanceLogsService],
  exports: [AttendanceLogsService],
})
export class AttendanceLogsModule {} 