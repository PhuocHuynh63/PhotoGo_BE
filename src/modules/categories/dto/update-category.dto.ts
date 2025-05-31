import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './category.dto';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
    @IsDate()
    @IsOptional()
    updated_at: Date;
}