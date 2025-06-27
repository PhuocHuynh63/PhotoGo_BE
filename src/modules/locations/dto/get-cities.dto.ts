import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class GetCitiesDto {
    paginationDto: PaginationDto;

    @IsOptional()
    @IsIn(['city', 'ward', 'district', 'province'])
    @ApiProperty({
        description: 'Field để filter (city, ward, district, province)',
        enum: ['city', 'ward', 'district', 'province'],
        example: 'city',
        required: false,
    })
    filterField?: string;
} 