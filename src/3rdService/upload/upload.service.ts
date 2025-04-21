import { Injectable, Inject, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(@Inject('Cloudinary') private cloudinary) {}

  async resizeImage(file: Express.Multer.File): Promise<Buffer> {
    return sharp(file.buffer)
      .resize({ width: 800, height: 800, fit: 'inside' }) // Resize về 800x800, giữ tỷ lệ
      .toBuffer();
  }

  async uploadFile(file: Express.Multer.File): Promise<{ message: string; url: string }> {
    const startTime = Date.now();
    this.logger.log(`Starting upload for file: ${file.originalname}`);

    const resizedBuffer = await this.resizeImage(file);

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder: 'uploads', public_id: file.originalname.split('.')[0], timeout: 60000 },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Upload failed for ${file.originalname}: ${error.message}`);
            return reject(new Error('Upload failed!'));
          }
          this.logger.log(`Upload completed for ${file.originalname} in ${Date.now() - startTime}ms`);
          resolve({ message: 'Upload thành công!', url: result.secure_url });
        },
      );

      uploadStream.end(resizedBuffer);
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string, oldImageUrl?: string): Promise<string> {
    const startTime = Date.now();
    this.logger.log(`Starting image upload for file: ${file.originalname} to folder: ${folder}`);

    const resizedBuffer = await this.resizeImage(file);

    return new Promise((resolve, reject) => {
      const uploadNewImage = () => {
        this.cloudinary.uploader.upload_stream(
          { folder, timeout: 60000 },
          (error, result: UploadApiResponse) => {
            if (error) {
              this.logger.error(`Image upload failed for ${file.originalname}: ${error.message}`);
              return reject(error);
            }
            if (result.secure_url === oldImageUrl) {
              this.logger.log(`Image unchanged for ${file.originalname}`);
              return resolve(oldImageUrl);
            }
            this.logger.log(`Image upload completed for ${file.originalname} in ${Date.now() - startTime}ms`);
            resolve(result.secure_url);
          },
        ).end(resizedBuffer);
      };

      if (oldImageUrl) {
        const publicId = oldImageUrl.split('/').pop().split('.')[0];
        this.cloudinary.uploader.destroy(`${folder}/${publicId}`, (error, result) => {
          if (error) {
            this.logger.error(`Failed to delete old image ${publicId}: ${error.message}`);
            return reject(error);
          }
          this.logger.log(`Deleted old image ${publicId}`);
          uploadNewImage();
        });
      } else {
        uploadNewImage();
      }
    });
  }
}