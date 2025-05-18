import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './entities/point.entity';
import { CreatePointDto, CreatePointTransactionDto } from './dto/create-point.dto';
import { FindPointDto } from './dto/find-point.dto';
import { PointTransaction } from './entities/point-transaction.entity';
import { isUUID } from 'class-validator';
import { UpdatePointDto } from './dto/update-point.dto';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
  ) { }

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
        `(unaccent(user.email) ILIKE unaccent(:term) OR unaccent(user.full_name) ILIKE unaccent(:term))`,
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
    if (!isUUID(id)) {
      throw new NotFoundException('ID không hợp lệ');
    }
    const point = await this.pointRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!point) {
      throw new NotFoundException(`Điểm thưởng với id ${id} không tồn tại`);
    }
    return point;
  }
  //#endregion findOne

  // PointTransaction Methods

  //#region createTransaction
  async createTransaction(createPointTransactionDto: CreatePointTransactionDto): Promise<PointTransaction> {
    const transaction = this.pointTransactionRepository.create(createPointTransactionDto);
    return this.pointTransactionRepository.save(transaction);
  }
  //#endregion createTransaction

  //#region findAllTransactions
  async findAllTransactions(): Promise<PointTransaction[]> {
    return this.pointTransactionRepository.find({ relations: ['point'] });
  }
  //#endregion findAllTransactions

  //#region findOneTransaction
  async findTransactionsByPointId(pointId: string): Promise<PointTransaction[]> {
    const transactions = await this.pointTransactionRepository.find({
      where: { point: { id: pointId } },
      relations: ['point'],
    });

    if (!transactions.length) {
      throw new NotFoundException(`Không tìm thấy giao dịch cho điểm ID: ${pointId}`);
    }

    return transactions;
  }
  //#endregion findOneTransaction

  //#region update
  async update(id: string, updatePointDto: UpdatePointDto): Promise<Point> {
    const point = await this.pointRepository.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Điểm thưởng với id ${id} không tồn tại`);
    }

    Object.assign(point, updatePointDto);
    return this.pointRepository.save(point);
  }
  //#endregion update

  //#region remove
  async remove(id: string): Promise<void> {
    const point = await this.pointRepository.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Điểm thưởng với id ${id} không tồn tại`);
    }

    await this.pointRepository.remove(point);
  }
  //#endregion remove

}