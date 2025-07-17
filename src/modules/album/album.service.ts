import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Album } from './entities/album.entity';
import { VendorAlbum } from './entities/vendor-album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumPaginationDto } from './dto/pagination.dto';
import { UploadService } from '../../3rdService/upload/upload.service';
import { CreateAlbumMultipartDto } from './dto/create-album-multipart.dto';
import { UpdateAlbumMultipartDto } from './dto/update-album-multipart.dto';
import { AlbumStatus } from 'src/constants/album.enum';
import { AlbumFilterDto } from './dto/filter.dto';

@Injectable()
export class AlbumService {
  // Helper: DD/MM/YYYY => YYYY-MM-DD
  private convertDateToISO(date: string): string {
    if (!date) return date;
    const [day, month, year] = date.split('/');
    if (!day || !month || !year) throw new BadRequestException('Sai định dạng ngày, phải là DD/MM/YYYY');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Helper: YYYY-MM-DD => DD/MM/YYYY
  private convertDateToVN(date: string | Date): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  constructor(
    @InjectRepository(Album)
    private readonly albumRepository: Repository<Album>,
    @InjectRepository(VendorAlbum)
    private readonly vendorAlbumRepository: Repository<VendorAlbum>,
    private readonly uploadService: UploadService,
  ) {}

  async createVendorAlbum(locationId: string) {
    const vendorAlbum = this.vendorAlbumRepository.create({ location: { id: locationId } });
    return this.vendorAlbumRepository.save(vendorAlbum);
  }

  async getVendorAlbums(locationId: string, query: AlbumPaginationDto = {}) {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const [data, total] = await this.vendorAlbumRepository.findAndCount({
      where: { location: { id: locationId } },
      relations: ['albums', 'albums.booking', 'albums.booking.user'],
      skip,
      take: pageSize,
      order: { [sortBy]: sortDirection },
    });
    const totalPage = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem: total,
      },
    };
  }

  async createAlbum(dto: CreateAlbumDto) {
    if (dto.photos && dto.photos.length > 3) {
      throw new Error('Chỉ được lưu tối đa 3 ảnh');
    }
    const vendorAlbum = await this.vendorAlbumRepository.findOne({ where: { id: dto.vendorAlbumId } });
    if (!vendorAlbum) throw new NotFoundException('Không tìm thấy vendor album');
    const album = this.albumRepository.create({ ...dto, vendorAlbum });
    return this.albumRepository.save(album);
  }

  async createAlbumWithUpload(
    dto: CreateAlbumMultipartDto,
    photoFiles?: Express.Multer.File[],
    behindTheSceneFiles?: Express.Multer.File[],
  ) {
    // Validate file count
    if (photoFiles && photoFiles.length > 3) {
      throw new BadRequestException('Chỉ được upload tối đa 3 ảnh cho photos');
    }
    if (behindTheSceneFiles && behindTheSceneFiles.length > 3) {
      throw new BadRequestException('Chỉ được upload tối đa 3 ảnh cho behind the scenes');
    }

    // Upload photos
    let photoUrls: string[] = [];
    if (photoFiles && photoFiles.length > 0) {
      photoUrls = await this.uploadService.uploadImages(photoFiles, 'album/photos');
    }

    // Upload behind the scenes
    let behindTheSceneUrls: string[] = [];
    if (behindTheSceneFiles && behindTheSceneFiles.length > 0) {
      behindTheSceneUrls = await this.uploadService.uploadImages(behindTheSceneFiles, 'album/behind-the-scenes');
    }

    // Create vendor album first
    const locationObj = { id: dto.locationId };
    const vendorAlbum = this.vendorAlbumRepository.create({ location: locationObj });
    const savedVendorAlbum = await this.vendorAlbumRepository.save(vendorAlbum);

    // Convert date to ISO (YYYY-MM-DD)
    let isoDate = undefined;
    if (dto.date) {
      isoDate = this.convertDateToISO(dto.date);
    }

    // Create album with uploaded URLs
    const album = this.albumRepository.create({
      bookingId: dto.bookingId,
      date: isoDate,
      driveLink: dto.driveLink,
      photos: Array.isArray(photoUrls) ? photoUrls : (photoUrls ? [photoUrls] : []),
      behindTheScenes: Array.isArray(behindTheSceneUrls) ? behindTheSceneUrls : (behindTheSceneUrls ? [behindTheSceneUrls] : []),
      vendorAlbum: savedVendorAlbum,
      status: dto.status,
    });

    const savedAlbum = await this.albumRepository.save(album);

    // Convert date back to DD/MM/YYYY for response
    const responseAlbum = { ...savedAlbum, date: this.convertDateToVN(savedAlbum.date) };

    // Return both vendor album and album
    return {
      vendorAlbum: savedVendorAlbum,
      album: responseAlbum,
    };
  }

  async updateAlbum(albumId: string, dto: UpdateAlbumDto) {
    const album = await this.albumRepository.findOne({ where: { id: albumId }, relations: ['vendorAlbum'] });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    if (dto.vendorAlbumId) {
      const vendorAlbum = await this.vendorAlbumRepository.findOne({ where: { id: dto.vendorAlbumId } });
      if (!vendorAlbum) throw new NotFoundException('Không tìm thấy vendor album');
      album.vendorAlbum = vendorAlbum;
    }
    if (dto.photos && dto.photos.length > 3) {
      throw new Error('Chỉ được lưu tối đa 3 ảnh');
    }
    this.albumRepository.merge(album, dto);
    return this.albumRepository.save(album);
  }

  async updateAlbumWithUpload(
    albumId: string,
    dto: UpdateAlbumMultipartDto,
    photoFiles?: Express.Multer.File[],
    behindTheSceneFiles?: Express.Multer.File[],
  ) {
    // Find existing album
    const album = await this.albumRepository.findOne({ where: { id: albumId }, relations: ['vendorAlbum'] });
    if (!album) throw new NotFoundException('Không tìm thấy album');

    // Validate file count
    if (photoFiles && photoFiles.length > 3) {
      throw new BadRequestException('Chỉ được upload tối đa 3 ảnh cho photos');
    }
    if (behindTheSceneFiles && behindTheSceneFiles.length > 3) {
      throw new BadRequestException('Chỉ được upload tối đa 3 ảnh cho behind the scenes');
    }

    // Upload new photos if provided
    let photoUrls: string[] = album.photos || [];
    if (photoFiles && photoFiles.length > 0) {
      const newPhotoUrls = await this.uploadService.uploadImages(photoFiles, 'album/photos');
      // Lọc bỏ các URL đã tồn tại
      const uniqueNewPhotoUrls = newPhotoUrls.filter(url => !photoUrls.includes(url));
      photoUrls = [...photoUrls, ...uniqueNewPhotoUrls];
      // Giới hạn tối đa 3 ảnh
      photoUrls = photoUrls.slice(0, 3);
    }

    // Upload new behind the scenes if provided
    let behindTheSceneUrls: string[] = album.behindTheScenes || [];
    if (behindTheSceneFiles && behindTheSceneFiles.length > 0) {
      const newBehindTheSceneUrls = await this.uploadService.uploadImages(behindTheSceneFiles, 'album/behind-the-scenes');
      // Lọc bỏ các URL đã tồn tại
      const uniqueNewBehindTheSceneUrls = newBehindTheSceneUrls.filter(url => !behindTheSceneUrls.includes(url));
      behindTheSceneUrls = [...behindTheSceneUrls, ...uniqueNewBehindTheSceneUrls];
      // Giới hạn tối đa 3 ảnh
      behindTheSceneUrls = behindTheSceneUrls.slice(0, 3);
    }

    // Convert date to ISO (YYYY-MM-DD)
    let isoDate = undefined;
    if (dto.date) {
      isoDate = this.convertDateToISO(dto.date);
    }

    // Update album with new data
    this.albumRepository.merge(album, {
      bookingId: dto.bookingId,
      date: isoDate,
      driveLink: dto.driveLink,
      photos: photoUrls,
      behindTheScenes: behindTheSceneUrls,
      status: AlbumStatus.UPLOADED,
    });

    const savedAlbum = await this.albumRepository.save(album);

    // Convert date back to DD/MM/YYYY for response
    const responseAlbum = { ...savedAlbum, date: this.convertDateToVN(savedAlbum.date) };

    return responseAlbum;
  }

  async getAlbum(albumId: string) {
    const album = await this.albumRepository.findOne({ where: { id: albumId }, relations: ['vendorAlbum', 'booking', 'booking.user'] });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    return album;
  }

  async deleteAlbum(albumId: string) {
    const album = await this.albumRepository.findOne({ where: { id: albumId } });
    if (!album) throw new NotFoundException('Không tìm thấy album');
    await this.albumRepository.delete({ id: albumId });
    return { message: 'Đã xóa album thành công' };
  }

  async getAlbumsByVendorAlbum(vendorAlbumId: string, query: AlbumPaginationDto = {}) {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const where: any = { vendorAlbum: { id: vendorAlbumId } };
    const [data, total] = await this.albumRepository.findAndCount({
      where,
      relations: ['vendorAlbum', 'booking', 'booking.user'],
      skip,
      take: pageSize,
      order: { [sortBy]: sortDirection },
    });
    const totalPage = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem: total,
      },
    };
  }

  async getAlbumsByUserId(userId: string, query: AlbumPaginationDto = {}) {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const where: any = { booking: { user: { id: userId } } };
    const [data, total] = await this.albumRepository.findAndCount({
      where,
      relations: ['vendorAlbum', 'booking', 'booking.user'],
      skip,
      take: pageSize,
      order: { [sortBy]: sortDirection },
    });
    const totalPage = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem: total,
      },
    };
  }

  async getAlbumsByLocation(locationId: string, query: AlbumFilterDto) {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC', albumStatus, date } = query;
    const skip = (current - 1) * pageSize;

    // 1. Lấy vendorAlbum theo locationId
    const vendorAlbum = await this.vendorAlbumRepository.findOne({
      where: { location: { id: locationId } },
    });
    if (!vendorAlbum) {
      throw new NotFoundException('Không tìm thấy vendor album cho location này');
    }

    // 2. Tạo điều kiện where cho Album
    const where: any = {
      vendorAlbum: { id: vendorAlbum.id },
    };
    if (date) {
      where.date = this.convertDateToISO(date);
    }
    if (albumStatus) {
      where.status = albumStatus;
    }

    const [data, total] = await this.albumRepository.findAndCount({
      where,
      relations: ['vendorAlbum', 'booking', 'booking.user'],
      skip,
      take: pageSize,
      order: { [sortBy]: sortDirection },
    });
    const totalPage = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem: total,
      },
    };
  }

  async getAlbumsByBookingId(bookingId: string, query: AlbumPaginationDto = {}): Promise<{
    data: Album[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const where: any = { booking: { id: bookingId } };
    const [data, total] = await this.albumRepository.findAndCount({
      where,
      relations: ['vendorAlbum', 'booking', 'booking.user'],
      skip,
      take: pageSize,
      order: { [sortBy]: sortDirection },
    });
    const totalPage = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem: total,
      },
    };
  }

  // async getAlbumsByDate(date: string, query: AlbumPaginationDto = {}) {
  //   const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
  //   const skip = (current - 1) * pageSize;
  //   const where: any = { date: this.convertDateToISO(date) };
  //   const [data, total] = await this.albumRepository.findAndCount({
  //     where,
  //     relations: ['vendorAlbum', 'booking', 'booking.user'],
  //     skip,
  //     take: pageSize,
  //     order: { [sortBy]: sortDirection },
  //   });
  //   const totalPage = Math.ceil(total / pageSize);
  //   return {
  //     data,
  //     pagination: {
  //       current,
  //       pageSize,
  //       totalPage,
  //       totalItem: total,
  //     },
  //   };
  // }
} 