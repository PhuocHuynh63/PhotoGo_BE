import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Album } from './entities/album.entity';
import { VendorAlbum } from './entities/vendor-album.entity';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumPaginationDto } from './dto/pagination.dto';

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(Album)
    private readonly albumRepository: Repository<Album>,
    @InjectRepository(VendorAlbum)
    private readonly vendorAlbumRepository: Repository<VendorAlbum>,
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