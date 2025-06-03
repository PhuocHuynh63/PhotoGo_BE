import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/category.dto';
import { FindCategoryDto } from './dto/find-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }

  //#region create
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Kiểm tra ID đã tồn tại
    const existingCategory = await this.categoryRepository.findOne({
      where: { id: createCategoryDto.id },
    });

    if (existingCategory) {
      throw new ConflictException('ID danh mục đã tồn tại');
    }

    // Kiểm tra tên đã tồn tại
    const existingName = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingName) {
      throw new ConflictException('Tên danh mục đã tồn tại');
    }

    const category = this.categoryRepository.create(createCategoryDto);
    category.created_at = new Date();
    return this.categoryRepository.save(category);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindCategoryDto): Promise<{
    data: Category[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    // Validate pagination parameters
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;

    if (currentPage < 1) {
      throw new BadRequestException('Số trang phải lớn hơn 0');
    }

    if (pageSize < 1 || pageSize > 100) {
      throw new BadRequestException('Kích thước trang phải từ 1 đến 100');
    }

    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(category.name) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }

    // Validate sort parameters
    const allowedSortFields = ['id', 'name', 'created_at', 'updated_at'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`category.${sortField}`, sortDirection);
    queryBuilder.skip(skip).take(pageSize);

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
  //#endregion findAll

  //#region findOne
  async findOne(id: string): Promise<Category> {
    if (!id) {
      throw new BadRequestException('ID danh mục không được để trống');
    }

    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['serviceConcepts'], // Load relations để kiểm tra dependencies
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID ${id}`);
    }

    return category;
  }
  //#endregion findOne

  //#region update
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    // Kiểm tra nếu đang cập nhật tên
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingName = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingName && existingName.id !== id) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
    }

    // Kiểm tra nếu đang cập nhật ID
    if (updateCategoryDto.id && updateCategoryDto.id !== category.id) {
      const existingId = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.id },
      });

      if (existingId) {
        throw new ConflictException('ID danh mục đã tồn tại');
      }
    }

    Object.assign(category, updateCategoryDto);
    category.updated_at = new Date();
    return this.categoryRepository.save(category);
  }
  //#endregion update

  //#region remove
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Kiểm tra xem danh mục có đang được sử dụng không
    if (category.vendors && category.vendors.length > 0) {
      throw new ConflictException('Không thể xóa danh mục đang được sử dụng bởi các nhà cung cấp');
    }

    await this.categoryRepository.remove(category);
  }
  //#endregion remove
}