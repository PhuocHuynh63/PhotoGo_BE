import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller'; // Import the controller

@Module({
  imports: [TypeOrmModule.forFeature([Vendor])],
  providers: [VendorService],
  controllers: [VendorController], // Add this
  exports: [VendorService],
})
export class VendorModule {}