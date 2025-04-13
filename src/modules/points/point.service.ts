import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './entities/point.entity';
import { CreatePointDto } from './dto/create-point.dto';
import { FindPointDto } from './dto/find-point.dto';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
  ) {}

  //#region create
  async create(createPointDto: CreatePointDto): Promise<Point> {
    const point = this.pointRepository.create(createPointDto);
    return this.pointRepository.save(point);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindPointDto): Promise<{
    data: Point[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Filter
    const queryBuilder = this.pointRepository.createQueryBuilder('point');

    queryBuilder.leftJoinAndSelect('point.user', 'user');

    if (query.term) {
      queryBuilder.andWhere(
        '(user.email ILIKE :term OR user.full_name ILIKE :term)',
        { term: `%${query.term}%` },
      );
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['created_at', 'updated_at', 'balance'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`point.${sortField}`, sortDirection);
    //#endregion

    //#region Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

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
  async findOne(id: string): Promise<Point> {
    const point = await this.pointRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!point) {
      throw new NotFoundException(`Point with ID ${id} not found`);
    }
    return point;
  }
  //#endregion findOne
}