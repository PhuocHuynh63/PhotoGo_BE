import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}