import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/category.dto';
import { Category } from './entities/category.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindCategoryDto } from './dto/find-category.dto';
import { Param, Res } from '@nestjs/common/decorators/http/route-params.decorator';
import { ApiOkResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';

@ApiTags('Categories')
@Controller('categories')
@ApiBearerAuth('access-token')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category (Protected)' })
  @ApiResponse({ status: 201, description: 'Category created successfully', type: Category })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Tạo danh mục thành công')
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all categories (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of categories with pagination',
    type: [Category],
  })
  @ResponseMessage('Lấy danh sách danh mục thành công')
  async findAll(@Query() query: FindCategoryDto): Promise<{
    data: Category[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.categoryService.findAll(query);
  }

  // Thêm phương thức findOne
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID (Protected)' })
  @ApiResponse({ status: 200, description: 'Category found', type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Lấy thông tin danh mục thành công')
  async findOne(@Param('id') id: string): Promise<Category> {
    return this.categoryService.findOne(id);
  }
}