import { Module } from '@nestjs/common';
import { AlbumService } from './album.service';
import { AlbumController } from './album.controller';
import { UploadModule } from '../../3rdService/upload/upload.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './entities/album.entity';
import { VendorAlbum } from './entities/vendor-album.entity';
import { Location } from '../locations/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Album, VendorAlbum, Location]), UploadModule],
  controllers: [AlbumController],
  providers: [AlbumService],
})
export class AlbumModule {} 