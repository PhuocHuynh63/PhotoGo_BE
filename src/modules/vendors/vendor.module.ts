import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller'; // Import the controller
import { ServicePackage } from '../service-package/entities/service-package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, ServicePackage])],
  providers: [VendorService],
  controllers: [VendorController], // Add this
  exports: [VendorService],
})
export class VendorModule {}