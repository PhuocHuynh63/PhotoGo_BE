import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationAvailability } from './entities/location-availability.entity';
import { LocationAvailabilityService } from './location-availability.service';
import { LocationAvailabilityController } from './location-availability.controller';
import { Location } from './entities/location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationAvailability, Location]),
  ],
  controllers: [LocationAvailabilityController],
  providers: [LocationAvailabilityService],
  exports: [LocationAvailabilityService],
})
export class LocationAvailabilityModule {}
