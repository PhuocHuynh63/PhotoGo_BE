import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Point } from './entities/point.entity';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { PointTransaction } from './entities/point-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Point,PointTransaction])],
  providers: [PointService],
  controllers: [PointController],
  exports: [PointService],
})
export class PointModule {}