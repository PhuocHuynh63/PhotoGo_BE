import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { LocationAvailability } from './entities/location-availability.entity';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationAvailabilityController } from './location-availability.controller';
import { LocationAvailabilityService } from './location-availability.service';
import { Vendor } from '../vendors/entities/vendor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Location, LocationAvailability, Vendor]),
  ],
  controllers: [LocationController, LocationAvailabilityController],
  providers: [LocationService, LocationAvailabilityService],
  exports: [LocationService, LocationAvailabilityService],
})
export class LocationModule {}