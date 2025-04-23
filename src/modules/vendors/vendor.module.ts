import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { VendorManager } from './entities/vendor-manager.entity';
import { VendorLike } from './entities/vendor-like.entity';
import { VendorAvailability } from './entities/vendor-availability.entity';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { ServicePackage } from '../service-package/entities/service-package.entity';
import { UploadModule } from '../../3rdService/upload/upload.module'; // Import UploadModule
import { ReviewModule } from '../reviews/reviews.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, VendorManager, VendorLike, VendorAvailability, ServicePackage]), UploadModule, ReviewModule],
  providers: [VendorService],
  controllers: [VendorController],
  exports: [VendorService],
})
export class VendorModule {}