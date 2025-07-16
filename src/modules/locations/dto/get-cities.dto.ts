import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsIn } from 'class-validator';

export class GetCitiesDto {
    @IsOptional()
    @IsNumberString()
    @ApiProperty({
        description: 'Số thứ tự của trang hiện tại',
        example: '1',
        required: false,
    })
    current?: string;

    @IsOptional()
    @IsNumberString()
    @ApiProperty({
        description: 'Số lượng bản ghi trên mỗi trang',
        example: '10',
        required: false,
    })
    pageSize?: string;

    @IsOptional()
    @ApiProperty({
        description: 'Hướng sắp xếp',
        enum: ['asc', 'desc'],
        example: 'asc',
        required: false,
    })
    sortDirection?: 'asc' | 'desc';

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