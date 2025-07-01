import { IsOptional, IsString, IsNumber, Min, IsBoolean, IsDateString, ValidateIf, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FindAllDto {
    @ApiProperty({ required: false, example: 'Campaign 1' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ required: false, example: true })
    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @ApiProperty({ required: false, example: '01/01/2024' })
    @IsString()
    @IsOptional()
    @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
        message: 'Date must be in DD/MM/YYYY format',
      })
    startDate?: string;
    
    @ApiProperty({ required: false, example: '01/01/2024' })
    @IsString()
    @ValidateIf((o) => o.startDate !== undefined)
    @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
        message: 'Date must be in DD/MM/YYYY format',
      })
    @IsOptional()
    endDate?: string;

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

    @ApiProperty({ required: false,
        description: 'Sắp xếp theo trường',
        example: 'created_at',
        enum: ['created_at', 'name','startDate','endDate'],
    })
    @IsString()
    @IsOptional()
    sortBy?: string;

    @ApiProperty({ required: false,
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

