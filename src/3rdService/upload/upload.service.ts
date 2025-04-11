import { Injectable, Inject } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(@Inject('Cloudinary') private cloudinary) {}

  //#region uploadFile   
  async uploadFile(file: Express.Multer.File): Promise<{ message: string; url: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder: 'uploads', public_id: file.originalname.split('.')[0] },
        (error, result: UploadApiResponse) => {
          if (error) {
            console.error('Upload Error:', error);
            return reject(new Error('Upload failed!'));
          }
          resolve({ message: 'Upload thành công!', url: result.secure_url });
        },
      );
  
      uploadStream.end(file.buffer); // Đẩy buffer vào Cloudinary
    });
  }
  //#endregion

  //#region uploadImage 
  async uploadImage(file: Express.Multer.File, folder: string, oldImageUrl?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadNewImage = () => {
        this.cloudinary.uploader.upload_stream(
          { folder }, // Lưu vào thư mục được chỉ định
          (error, result: UploadApiResponse) => {
            if (error) return reject(error);
            if (result.secure_url === oldImageUrl) {
              return resolve(oldImageUrl); // Nếu URL trùng nhau, trả về URL cũ
            }
            resolve(result.secure_url); // Trả về URL ảnh mới
          }
        ).end(file.buffer);
      };
  
      if (oldImageUrl) {
        const publicId = oldImageUrl.split('/').pop().split('.')[0]; // Lấy public_id từ URL ảnh cũ
        this.cloudinary.uploader.destroy(`${folder}/${publicId}`, (error, result) => {
          if (error) {
            console.error('Error deleting old image:', error);
            return reject(error);
          }
          uploadNewImage();
        });
      } else {
        uploadNewImage();
      }
    });
  }
   //#endregion
}