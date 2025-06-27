import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Point } from './entities/point.entity';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { PointTransaction } from './entities/point-transaction.entity';
import { User } from '../users/entities/user.entity';
import { PointHelperService } from './point-helper.service';

@Module({
  imports: [TypeOrmModule.forFeature([Point, PointTransaction, User])],
  providers: [PointService, PointHelperService],
  controllers: [PointController],
  exports: [PointService, PointHelperService],
})
export class PointModule {}