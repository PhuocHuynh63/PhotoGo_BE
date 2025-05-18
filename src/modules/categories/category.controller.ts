import { Controller, Get, Post, Body, Query, Put, Delete } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/category.dto';
import { Category } from './entities/category.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindCategoryDto } from './dto/find-category.dto';
import { Param, Res } from '@nestjs/common/decorators/http/route-params.decorator';
import { ApiOkResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
@ApiBearerAuth('access-token')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Danh mục được tạo thành công', type: Category })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Tạo danh mục thành công')
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoryService.create(createCategoryDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả danh mục (Công khai)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách danh mục với phân trang',
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

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy danh mục theo ID (Protected)' })
  @ApiResponse({ status: 200, description: 'Danh mục được tìm thấy', type: Category })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Lấy thông tin danh mục thành công')
  async findOne(@Param('id') id: string): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục theo ID' })
  @ApiResponse({ status: 200, description: 'Danh mục được cập nhật thành công', type: Category })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục theo ID' })
  @ApiResponse({ status: 200, description: 'Danh mục được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.categoryService.remove(id);
  }
}