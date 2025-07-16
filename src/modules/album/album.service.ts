import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Album } from './entities/album.entity';
import { VendorAlbum } from './entities/vendor-album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumPaginationDto } from './dto/pagination.dto';
import { UploadService } from '../../3rdService/upload/upload.service';
import { CreateAlbumMultipartDto } from './dto/create-album-multipart.dto';
import { UpdateAlbumMultipartDto } from './dto/update-album-multipart.dto';

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(Album)
    private readonly albumRepository: Repository<Album>,
    @InjectRepository(VendorAlbum)
    private readonly vendorAlbumRepository: Repository<VendorAlbum>,
    private readonly uploadService: UploadService,
  ) {}

  async createVendorAlbum(locationId: string) {
    const vendorAlbum = this.vendorAlbumRepository.create({ locationId });
    return this.vendorAlbumRepository.save(vendorAlbum);
  }

  async getVendorAlbums(locationId: string, query: AlbumPaginationDto = {}) {
    const { current = 1, pageSize = 10, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const [data, total] = await this.vendorAlbumRepository.findAndCount({
      where: { locationId },
      relations: ['albums'],
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
    const vendorAlbum = this.vendorAlbumRepository.create({ locationId: dto.locationId });
    const savedVendorAlbum = await this.vendorAlbumRepository.save(vendorAlbum);

    // Create album with uploaded URLs
    const album = this.albumRepository.create({
      userId: dto.userId,
      driveLink: dto.driveLink,
      photos: photoUrls,
      behindTheScenes: behindTheSceneUrls,
      vendorAlbum: savedVendorAlbum,
    });

    const savedAlbum = await this.albumRepository.save(album);

    // Return both vendor album and album
    return {
      vendorAlbum: savedVendorAlbum,
      album: savedAlbum,
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
      photoUrls = [...photoUrls, ...newPhotoUrls];
    }

    // Upload new behind the scenes if provided
    let behindTheSceneUrls: string[] = album.behindTheScenes || [];
    if (behindTheSceneFiles && behindTheSceneFiles.length > 0) {
      const newBehindTheSceneUrls = await this.uploadService.uploadImages(behindTheSceneFiles, 'album/behind-the-scenes');
      behindTheSceneUrls = [...behindTheSceneUrls, ...newBehindTheSceneUrls];
    }

    // Update album with new data
    this.albumRepository.merge(album, {
      userId: dto.userId,
      driveLink: dto.driveLink,
      photos: photoUrls,
      behindTheScenes: behindTheSceneUrls,
    });

    return this.albumRepository.save(album);
  }

  async getAlbum(albumId: string) {
    const album = await this.albumRepository.findOne({ where: { id: albumId }, relations: ['vendorAlbum'] });
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
    const { current = 1, pageSize = 10, userId, createdAt, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const where: any = { vendorAlbum: { id: vendorAlbumId } };
    if (userId) where.userId = userId;
    if (createdAt) where.createdAt = Like(`%${createdAt}%`);
    const [data, total] = await this.albumRepository.findAndCount({
      where,
      relations: ['vendorAlbum'],
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
    const { current = 1, pageSize = 10, vendorAlbumId, createdAt, sortBy = 'createdAt', sortDirection = 'DESC' } = query;
    const skip = (current - 1) * pageSize;
    const where: any = { userId };
    if (vendorAlbumId) where.vendorAlbum = { id: vendorAlbumId };
    if (createdAt) where.createdAt = Like(`%${createdAt}%`);
    const [data, total] = await this.albumRepository.findAndCount({
      where,
      relations: ['vendorAlbum'],
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
} 