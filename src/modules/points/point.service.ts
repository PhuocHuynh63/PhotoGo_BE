import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from './entities/point.entity';
import { CreatePointDto, CreatePointTransactionDto } from './dto/create-point.dto';
import { FindPointDto, FindMyTransactionsDto, FindMyPointHistoryDto } from './dto/find-point.dto';
import { PointTransaction } from './entities/point-transaction.entity';
import { isUUID } from 'class-validator';
import { UpdatePointDto } from './dto/update-point.dto';
import { User } from '../users/entities/user.entity';
import { PointTransactionType } from 'src/constants/point.enum';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    const allowedUserSortFields = ['user.email', 'user.full_name'];

    let sortField = 'point.created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    if (query.sortBy) {
      if (allowedSortFields.includes(query.sortBy)) {
        sortField = `point.${query.sortBy}`;
      } else if (allowedUserSortFields.includes(query.sortBy)) {
        sortField = query.sortBy;
      }
    }

    queryBuilder.orderBy(sortField, sortDirection as 'ASC' | 'DESC');
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

  //#region findMyPoints
  async findMyPoints(userId: string): Promise<Point> {
    console.log('Finding points for user ID:', userId);

    let point = await this.pointRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    console.log('Found point:', point);

    // Nếu chưa có điểm, tạo mới với balance = 0
    if (!point) {
      console.log('Creating new point for user:', userId);

      // Tìm user trước
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
      }

      point = this.pointRepository.create({
        user: user,
        balance: 0,
      });
      point = await this.pointRepository.save(point);

      // Load lại với relations
      point = await this.pointRepository.findOne({
        where: { id: point.id },
        relations: ['user'],
      });

      console.log('Created new point:', point);
    }

    return point;
  }
  //#endregion findMyPoints

  //#region findMyTransactions
  async findMyTransactions(userId: string, query: FindMyTransactionsDto): Promise<{
    data: PointTransaction[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    console.log('Finding transactions for user ID:', userId);

    // Tìm point của user trước
    const point = await this.pointRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!point) {
      console.log('No point found for user, creating new point');
      // Tạo point mới nếu chưa có
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
      }

      const newPoint = this.pointRepository.create({
        user: user,
        balance: 0,
      });
      await this.pointRepository.save(newPoint);

      // Trả về mảng rỗng vì chưa có transaction
      return {
        data: [],
        pagination: {
          current: 1,
          pageSize: 10,
          totalPage: 1,
          totalItem: 0,
        },
      };
    }

    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Query Builder
    const queryBuilder = this.pointTransactionRepository.createQueryBuilder('transaction');

    queryBuilder.where('transaction.point.id = :pointId', { pointId: point.id });

    // Filter theo type
    if (query.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: query.type });
    }

    // Sort
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';
    queryBuilder.orderBy('transaction.created_at', sortDirection);

    // Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    console.log('Found transactions:', data.length);

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
  //#endregion findMyTransactions

  // PointTransaction Methods

  //#region createTransaction
  async createTransaction(createPointTransactionDto: CreatePointTransactionDto): Promise<PointTransaction> {
    console.log('Creating transaction with DTO:', createPointTransactionDto);

    // Tìm point trước
    const point = await this.pointRepository.findOne({
      where: { id: createPointTransactionDto.pointId },
    });

    if (!point) {
      throw new NotFoundException(`Không tìm thấy point với ID: ${createPointTransactionDto.pointId}`);
    }

    // Tạo transaction với reference đến point
    const transaction = this.pointTransactionRepository.create({
      point: point,
      amount: createPointTransactionDto.amount,
      type: createPointTransactionDto.type,
      description: createPointTransactionDto.description,
    });

    const savedTransaction = await this.pointTransactionRepository.save(transaction);
    console.log('Created transaction:', savedTransaction.id);

    return savedTransaction;
  }
  //#endregion createTransaction

  //#region findAllTransactions
  async findAllTransactions(): Promise<PointTransaction[]> {
    return this.pointTransactionRepository.find({
      order: { created_at: 'DESC' },
    });
  }
  //#endregion findAllTransactions

  //#region findOneTransaction
  async findTransactionsByPointId(pointId: string): Promise<PointTransaction[]> {
    const transactions = await this.pointTransactionRepository.find({
      where: { point: { id: pointId } },
      order: { created_at: 'DESC' },
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

  //#region addPointsToUser - Method chung để cộng điểm
  async addPointsToUser(
    userId: string,
    amount: number,
    type: PointTransactionType,
    description: string
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    console.log(`Adding ${amount} points to user ${userId} for ${description}`);

    // Lấy hoặc tạo thông tin điểm của người dùng
    let userPoint;
    try {
      userPoint = await this.findMyPoints(userId);
      console.log('Found existing point:', userPoint.id);
    } catch (error) {
      console.log('User has no point record, creating new one');
      // Nếu chưa có point, tạo mới
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
      }

      userPoint = await this.create({
        user_id: userId,
        balance: 0,
      });
      console.log('Created new point:', userPoint.id);
    }

    // Cập nhật balance
    const newBalance = userPoint.balance + amount;
    const updatedPoint = await this.update(userPoint.id, {
      balance: newBalance,
    });
    console.log(`Updated balance from ${userPoint.balance} to ${newBalance}`);

    // Tạo transaction record
    const transaction = await this.createTransaction({
      pointId: userPoint.id,
      amount: amount,
      type: type,
      description: description,
    });
    console.log('Created transaction:', transaction.id);

    return { point: updatedPoint, transaction };
  }
  //#endregion addPointsToUser

  //#region deductPointsFromUser - Method chung để trừ điểm
  async deductPointsFromUser(
    userId: string,
    amount: number,
    type: PointTransactionType,
    description: string
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    console.log(`Deducting ${amount} points from user ${userId} for ${description}`);

    // Lấy thông tin điểm của người dùng
    const userPoint = await this.findMyPoints(userId);

    // Kiểm tra balance có đủ không
    if (userPoint.balance < amount) {
      throw new BadRequestException(`Số điểm không đủ`);
    }

    // Cập nhật balance
    const newBalance = userPoint.balance - amount;
    const updatedPoint = await this.update(userPoint.id, {
      balance: newBalance,
    });
    console.log(`Updated balance from ${userPoint.balance} to ${newBalance}`);

    // Tạo transaction record (amount sẽ là số âm)
    const transaction = await this.createTransaction({
      pointId: userPoint.id,
      amount: -amount, // Số âm để thể hiện việc trừ điểm
      type: type,
      description: description,
    });
    console.log('Created transaction:', transaction.id);

    return { point: updatedPoint, transaction };
  }
  //#endregion deductPointsFromUser

  //#region findMyPointHistory - Lấy lịch sử thay đổi điểm với thống kê
  async findMyPointHistory(userId: string, query: FindMyPointHistoryDto): Promise<{
    data: PointTransaction[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
    statistics: {
      totalEarned: number;
      totalRedeemed: number;
      totalExpired: number;
      currentBalance: number;
    };
  }> {
    console.log('Finding point history for user ID:', userId);

    // Tìm point của user trước
    const point = await this.pointRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!point) {
      console.log('No point found for user, creating new point');
      // Tạo point mới nếu chưa có
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy người dùng với ID: ${userId}`);
      }

      const newPoint = this.pointRepository.create({
        user: user,
        balance: 0,
      });
      await this.pointRepository.save(newPoint);

      // Trả về mảng rỗng vì chưa có transaction
      return {
        data: [],
        pagination: {
          current: 1,
          pageSize: 10,
          totalPage: 1,
          totalItem: 0,
        },
        statistics: {
          totalEarned: 0,
          totalRedeemed: 0,
          totalExpired: 0,
          currentBalance: 0,
        },
      };
    }

    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Query Builder cho transactions
    const queryBuilder = this.pointTransactionRepository.createQueryBuilder('transaction');

    queryBuilder.where('transaction.point.id = :pointId', { pointId: point.id });

    // Filter theo type
    if (query.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: query.type });
    }

    // Filter theo khoảng thời gian
    if (query.startDate) {
      queryBuilder.andWhere('transaction.created_at >= :startDate', {
        startDate: new Date(query.startDate)
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('transaction.created_at <= :endDate', {
        endDate: new Date(query.endDate)
      });
    }

    // Filter theo khoảng số điểm (dựa trên giá trị tuyệt đối)
    if (query.minAmount) {
      queryBuilder.andWhere('ABS(transaction.amount) >= :minAmount', {
        minAmount: Number(query.minAmount)
      });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere('ABS(transaction.amount) <= :maxAmount', {
        maxAmount: Number(query.maxAmount)
      });
    }

    // Sort
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';
    queryBuilder.orderBy('transaction.created_at', sortDirection);

    // Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    //#region Tính toán thống kê
    const statisticsQueryBuilder = this.pointTransactionRepository.createQueryBuilder('transaction');
    statisticsQueryBuilder.where('transaction.point.id = :pointId', { pointId: point.id });

    // Áp dụng các filter tương tự cho thống kê
    if (query.startDate) {
      statisticsQueryBuilder.andWhere('transaction.created_at >= :startDate', {
        startDate: new Date(query.startDate)
      });
    }

    if (query.endDate) {
      statisticsQueryBuilder.andWhere('transaction.created_at <= :endDate', {
        endDate: new Date(query.endDate)
      });
    }

    if (query.minAmount) {
      statisticsQueryBuilder.andWhere('ABS(transaction.amount) >= :minAmount', {
        minAmount: Number(query.minAmount)
      });
    }

    if (query.maxAmount) {
      statisticsQueryBuilder.andWhere('ABS(transaction.amount) <= :maxAmount', {
        maxAmount: Number(query.maxAmount)
      });
    }

    // Tính tổng điểm kiếm được
    const totalEarnedResult = await statisticsQueryBuilder
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .andWhere('transaction.type = :type', { type: PointTransactionType.EARN })
      .getRawOne();

    // Tính tổng điểm đã đổi thưởng (số âm)
    const totalRedeemedResult = await statisticsQueryBuilder
      .select('COALESCE(ABS(SUM(transaction.amount)), 0)', 'total')
      .andWhere('transaction.type = :type', { type: PointTransactionType.REDEEM })
      .getRawOne();

    // Tính tổng điểm hết hạn (số âm)
    const totalExpiredResult = await statisticsQueryBuilder
      .select('COALESCE(ABS(SUM(transaction.amount)), 0)', 'total')
      .andWhere('transaction.type = :type', { type: PointTransactionType.EXPIRE })
      .getRawOne();

    const totalEarned = Number(totalEarnedResult?.total || 0);
    const totalRedeemed = Number(totalRedeemedResult?.total || 0);
    const totalExpired = Number(totalExpiredResult?.total || 0);
    const currentBalance = point.balance;
    //#endregion

    console.log('Found transactions:', data.length);
    console.log('Statistics:', { totalEarned, totalRedeemed, totalExpired, currentBalance });

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
      statistics: {
        totalEarned,
        totalRedeemed,
        totalExpired,
        currentBalance,
      },
    };
  }
  //#endregion findMyPointHistory

}