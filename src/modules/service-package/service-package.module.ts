import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicePackage } from './entities/service-package.entity';
import { ServicePackageService } from './service-package.service';
import { ServicePackageController } from './service-package.controller';
import { ServicePackageMetadata } from './entities/service-package-metadata.entity';
import { ServicePackageServiceType } from './entities/service-package-service-type.entity';
import { ServicePackagePriceOverride } from './entities/service-package-price-override.entity';
import { ServiceType } from './entities/service-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServicePackage,
      ServicePackageMetadata,
      ServicePackageServiceType,
      ServicePackagePriceOverride,
      ServiceType,
    ]),
  ],
  providers: [ServicePackageService],
  controllers: [ServicePackageController],
  exports: [ServicePackageService],
})
export class ServicePackageModule {}