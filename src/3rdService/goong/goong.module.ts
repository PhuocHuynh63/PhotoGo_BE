import { Module } from '@nestjs/common';
import { GoongService } from './goong.service';
import { GeocodingWrapperService } from './geocoding-wrapper.service';
import { GeocodingModule } from '../google/geocoding.module';

@Module({
    imports: [GeocodingModule],
    providers: [GoongService, GeocodingWrapperService],
    exports: [GoongService, GeocodingWrapperService],
})
export class GoongModule { }
