import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicePackage } from './entities/service-package.entity';
import { ServicePackageService } from './service-package.service';
import { ServicePackageController } from './service-package.controller';
import { ServicePackageMetadata } from './entities/service-package-metadata.entity';
import { ServiceConceptServiceType } from './entities/service-concept-service-type.entity';
import { ServiceType } from './entities/service-type.entity';
import { ServiceConcept } from './entities/service-concept.entity';
import { ServiceConceptImage } from './entities/service-concept-image.entity';
import { UploadModule } from 'src/3rdService/upload/upload.module';
import { AuthModule } from '../auth/auth.module';
import { GeminiModule } from 'src/3rdService/gemini/gemini.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServicePackage,
      ServicePackageMetadata,
      ServiceConceptServiceType,
      ServiceType,
      ServiceConcept,
      ServiceConceptImage,
    ]),
    UploadModule,
    AuthModule,
    GeminiModule,
  ],
  providers: [ServicePackageService],
  controllers: [ServicePackageController],
  exports: [ServicePackageService],
})
export class ServicePackageModule {}