import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationAvailability } from './entities/location-availability.entity';
import { LocationAvailabilityService } from './location-availability.service';
import { LocationAvailabilityController } from './location-availability.controller';
import { Location } from './entities/location.entity';
import { LocationWorkingDate } from './entities/location-workingdate.entity';
import { LocationSlotTime } from './entities/location-slot-time.entity';
import { LocationSlotTimeWorkingDate } from './entities/location-slot-time-working-date.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LocationAvailability,
      Location,
      LocationWorkingDate,
      LocationSlotTime,
      LocationSlotTimeWorkingDate,
      Booking,
    ]),
  ],
  controllers: [LocationAvailabilityController],
  providers: [LocationAvailabilityService],
  exports: [LocationAvailabilityService],
})
export class LocationAvailabilityModule {}
