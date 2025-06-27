import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { LocationAvailability } from './entities/location-availability.entity';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationAvailabilityController } from './location-availability.controller';
import { LocationAvailabilityService } from './location-availability.service';
import { Vendor } from '../vendors/entities/vendor.entity';
import { LocationWorkingDate } from './entities/location-workingdate.entity';
import { LocationSlotTime } from './entities/location-slot-time.entity';
import { LocationSlotTimeWorkingDate } from './entities/location-slot-time-working-date.entity';
import { GeocodingModule } from 'src/3rdService/google/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      LocationAvailability,
      Vendor,
      LocationWorkingDate,
      LocationSlotTime,
      LocationSlotTimeWorkingDate,
    ]),
    GeocodingModule,
  ],
  controllers: [LocationController, LocationAvailabilityController],
  providers: [LocationService, LocationAvailabilityService],
  exports: [LocationService, LocationAvailabilityService],
})
export class LocationModule {}