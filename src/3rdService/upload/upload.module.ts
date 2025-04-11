import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CloudinaryProvider } from './cloudinary/cloudinary.provider';

@Module({
  imports: [CloudinaryModule],
  controllers: [UploadController],
  providers: [UploadService, CloudinaryProvider], // Đăng ký UploadService
  exports: [UploadService], // Export nếu module khác cần dùng
})
export class UploadModule {}
