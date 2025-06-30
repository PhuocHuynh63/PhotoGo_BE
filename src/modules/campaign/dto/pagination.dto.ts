import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaginationDto {
    @ApiProperty({ required: false, default: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    current?: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    pageSize?: number = 10;

    @ApiProperty({ 
        required: false,
        description: 'Sắp xếp theo trường',
        example: 'createdAt',
        enum: ['createdAt', 'updatedAt'],
    })
    @IsString()
    @IsOptional()
    sortBy?: string;

    @ApiProperty({ 
        required: false,
        description: 'Sắp xếp theo hướng',
        example: 'asc',
        enum: ['asc', 'desc'],
    })
    @IsString()
    @IsOptional()
    sortDirection?: string;

    @ApiPropertyOptional({ description: 'Hiển thị tất cả', type: String, example: 'false', required: false })
    @IsOptional()
    showAll?: string;
}