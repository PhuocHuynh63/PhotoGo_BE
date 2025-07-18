import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUser } from './entities/voucher-user.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { FindVoucherDto } from './dto/find-voucher.dto';
import { CreateVoucherUserDto } from './dto/create-voucher.dto';
import { FindVoucherUserDto } from './dto/find-voucher.dto';
import { VoucherStatusEnum, VoucherUserStatusEnum, VoucherUserFromEnum } from 'src/constants/voucher.enum';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { User } from '../users/entities/user.entity';
import { UserCampaign } from '../campaign/entities/user-campaign.entity';
import { CampaignVoucher } from '../campaign/entities/campaign-voucher.entity';
import { Point } from '../points/entities/point.entity';
import { PointTransactionType } from 'src/constants/point.enum';
import { PointTransaction } from '../points/entities/point-transaction.entity';
import { PointHelperService } from '../points/point-helper.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class VoucherService {
  private readonly logger = new Logger(VoucherService.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherUser)
    private readonly voucherUserRepository: Repository<VoucherUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCampaign)
    private readonly userCampaignRepository: Repository<UserCampaign>,
    @InjectRepository(CampaignVoucher)
    private readonly campaignVoucherRepository: Repository<CampaignVoucher>,
    @InjectRepository(Point)
    private readonly pointRepository: Repository<Point>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    private readonly pointHelperService: PointHelperService,
    private readonly notificationService: NotificationService,
  ) { }

  //#region Voucher Operations
  async createVoucher(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const voucher = this.voucherRepository.create(createVoucherDto);
    return this.voucherRepository.save(voucher);
  }

  async findAllVouchers(query: FindVoucherDto): Promise<{
    data: Voucher[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.voucherRepository.createQueryBuilder('voucher');

    if (query.term) {
      // Tách từ khóa tìm kiếm thành các từ riêng biệt
      const searchTerms = query.term.trim().split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        const conditions = searchTerms.map((term, index) => {
          const paramName = `term${index}`;
          return `(voucher.code ILIKE :${paramName} OR voucher.discount_type::text ILIKE :${paramName} OR voucher.status::text ILIKE :${paramName})`;
        });

        const params = {};
        searchTerms.forEach((term, index) => {
          params[`term${index}`] = `%${term}%`;
        });

        queryBuilder.andWhere(`(${conditions.join(' AND ')})`, params);
      }
    }

    // Thêm filter theo status
    const currentDate = new Date();
    if (query.status) {
      if (query.status === VoucherStatusEnum.ACTIVE) {
        queryBuilder.andWhere('voucher.status = :voucherStatus', { voucherStatus: VoucherStatusEnum.ACTIVE })
          .andWhere('voucher.start_date <= :currentDate', { currentDate })
          .andWhere('voucher.end_date >= :currentDate', { currentDate });
      } else if (query.status === VoucherStatusEnum.EXPIRED) {
        queryBuilder.andWhere('(voucher.status != :voucherStatus OR voucher.end_date < :currentDate)', { voucherStatus: VoucherStatusEnum.ACTIVE, currentDate });
      } else if (query.status === VoucherStatusEnum.INACTIVE) {
        queryBuilder.andWhere('voucher.status != :voucherStatus', { voucherStatus: VoucherStatusEnum.ACTIVE });
      }
    }

    const allowedSortFields = ['created_at', 'updated_at', 'code', 'discount_value', 'status'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Xử lý sắp xếp theo maxPrice
    if (query.sortBy === 'maxPrice') {
      queryBuilder.orderBy('voucher.maxPrice', sortDirection);
    } else {
      queryBuilder.orderBy(`voucher.${sortField}`, sortDirection);
    }
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

  async findOneVoucher(id: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher với id ${id} không tồn tại`);
    }
    return voucher;
  }

  async updateVoucher(id: string, updateVoucherDto: Partial<UpdateVoucherDto>): Promise<Voucher> {
    await this.voucherRepository.update(id, updateVoucherDto);
    return this.findOneVoucher(id);
  }

  async deleteVoucher(id: string): Promise<void> {
    const result = await this.voucherRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Mã giảm giá với ID ${id} không tồn tại`);
    }
  }
  //#endregion Voucher Operations

  //#region VoucherUser Operations
  async createVoucherUser(userId: string, voucherId: string, createVoucherUserDto: CreateVoucherUserDto): Promise<VoucherUser> {
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException(`Mã giảm giá với ID ${voucherId} không tồn tại`);
    }

    // Check if voucher is already in a campaign
    const campaignVoucher = await this.campaignVoucherRepository.findOne({
      where: { voucherId: voucherId, isAvailable: true },
      relations: ['campaign'],
    });
    if (campaignVoucher) {
      throw new BadRequestException(`Mã giảm giá đã được sử dụng trong chiến dịch "${campaignVoucher.campaign.name}"`);
    }

    // Check if voucher has available quantity
    if (voucher.quantity <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết số lượng');
    }

    const currentDate = new Date();
    if (voucher.status !== VoucherStatusEnum.ACTIVE || currentDate < new Date(voucher.start_date) || currentDate > new Date(voucher.end_date)) {
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }

    const existingVoucherUser = await this.voucherUserRepository.findOne({
      where: { user_id: userId, voucher_id: voucherId },
    });
    if (existingVoucherUser) {
      throw new BadRequestException('Người dùng đã có mã giảm giá này');
    }

    const voucherUser = this.voucherUserRepository.create({
      user_id: userId,
      voucher_id: voucherId,
      status: VoucherUserStatusEnum.AVAILABLE,
      from: createVoucherUserDto.from || null,
      assigned_at: createVoucherUserDto.assigned_at || new Date(),
      used_at: null,
    });
    return this.voucherUserRepository.save(voucherUser);
  }

  async findAllVoucherUsers(query: FindVoucherUserDto): Promise<{
    data: VoucherUser[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.voucherUserRepository.createQueryBuilder('voucherUser')
      .leftJoinAndSelect('voucherUser.user', 'user')
      .leftJoinAndSelect('voucherUser.voucher', 'voucher');

    if (query.user_id) {
      queryBuilder.andWhere('voucherUser.user_id = :user_id', { user_id: query.user_id });
    }

    // Thêm filter theo from
    if (query.from) {
      queryBuilder.andWhere('voucherUser.from = :from', { from: query.from });
    }

    // Thêm filter theo term (tìm kiếm)
    if (query.term) {
      // Tách từ khóa tìm kiếm thành các từ riêng biệt
      const searchTerms = query.term.trim().split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        const conditions = searchTerms.map((term, index) => {
          const paramName = `term${index}`;
          return `(voucher.code ILIKE :${paramName} OR voucher.discount_type::text ILIKE :${paramName} OR voucher.status::text ILIKE :${paramName})`;
        });

        const params = {};
        searchTerms.forEach((term, index) => {
          params[`term${index}`] = `%${term}%`;
        });

        queryBuilder.andWhere(`(${conditions.join(' AND ')})`, params);
      }
    }

    const currentDate = new Date();
    if (query.status) {
      if (query.status === VoucherUserStatusEnum.AVAILABLE) {
        queryBuilder.andWhere('voucherUser.status = :status', { status: VoucherUserStatusEnum.AVAILABLE })
          .andWhere('voucher.status = :voucherStatus', { voucherStatus: VoucherStatusEnum.ACTIVE })
          .andWhere('voucher.start_date <= :currentDate', { currentDate })
          .andWhere('voucher.end_date >= :currentDate', { currentDate });
      } else if (query.status === VoucherUserStatusEnum.USED) {
        queryBuilder.andWhere('voucherUser.status = :status', { status: VoucherUserStatusEnum.USED });
      } else if (query.status === VoucherUserStatusEnum.EXPIRED) {
        queryBuilder.andWhere('(voucher.status != :voucherStatus OR voucher.end_date < :currentDate)', { voucherStatus: VoucherStatusEnum.ACTIVE, currentDate });
      }
    }

    const allowedSortFields = ['assigned_at', 'used_at', 'created_at', 'updated_at'];
    let sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'assigned_at';
    const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Xử lý sắp xếp theo maxPrice của voucher
    if (query.sortBy === 'maxPrice') {
      queryBuilder.orderBy('voucher.maxPrice', sortDirection);
    } else {
      queryBuilder.orderBy(`voucherUser.${sortField}`, sortDirection);
    }

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

  async findAllVoucherUser(userId: string, query: FindVoucherUserDto): Promise<{
    data: any[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.voucherUserRepository.createQueryBuilder('voucherUser')
      .leftJoinAndSelect('voucherUser.user', 'user')
      .leftJoinAndSelect('voucherUser.voucher', 'voucher')
      .addSelect('voucher.maxprice')
      .where('voucherUser.user_id = :userId', { userId });

    if (query.from) {
      queryBuilder.andWhere('voucherUser.from = :from', { from: query.from });
    }

    // Thêm filter theo term (tìm kiếm)
    if (query.term) {
      // Tách từ khóa tìm kiếm thành các từ riêng biệt
      const searchTerms = query.term.trim().split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        const conditions = searchTerms.map((term, index) => {
          const paramName = `term${index}`;
          return `(voucher.code ILIKE :${paramName} OR voucher.discount_type::text ILIKE :${paramName} OR voucher.status::text ILIKE :${paramName})`;
        });

        const params = {};
        searchTerms.forEach((term, index) => {
          params[`term${index}`] = `%${term}%`;
        });

        queryBuilder.andWhere(`(${conditions.join(' AND ')})`, params);
      }
    }

    // Thêm filter theo trạng thái voucher user
    const currentDate = new Date();
    if (query.status) {
      if (query.status === VoucherUserStatusEnum.AVAILABLE) {
        queryBuilder.andWhere('voucherUser.status = :status', { status: VoucherUserStatusEnum.AVAILABLE })
          .andWhere('voucher.status = :voucherStatus', { voucherStatus: VoucherStatusEnum.ACTIVE })
          .andWhere('voucher.start_date <= :currentDate', { currentDate })
          .andWhere('voucher.end_date >= :currentDate', { currentDate });
      } else if (query.status === VoucherUserStatusEnum.USED) {
        queryBuilder.andWhere('voucherUser.status = :status', { status: VoucherUserStatusEnum.USED });
      } else if (query.status === VoucherUserStatusEnum.EXPIRED) {
        queryBuilder.andWhere('(voucher.status != :voucherStatus OR voucher.end_date < :currentDate)', { voucherStatus: VoucherStatusEnum.ACTIVE, currentDate });
      }
    }

    // Sắp xếp
    const allowedSortFields = ['assigned_at', 'used_at', 'created_at', 'updated_at'];
    let sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'assigned_at';
    const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Xử lý sắp xếp theo maxPrice của voucher
    if (query.sortBy === 'maxPrice') {
      queryBuilder.orderBy('voucher.maxPrice', sortDirection);
    } else {
      queryBuilder.orderBy(`voucherUser.${sortField}`, sortDirection);
    }

    // Phân trang
    queryBuilder.skip(skip).take(pageSize);

    // Thực hiện query
    const [voucherUsers, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    // Thêm trạng thái is_valid cho từng voucher
    const data = voucherUsers.map(vu => ({
      ...vu,
      is_valid:
        currentDate >= new Date(vu.voucher.start_date) &&
        currentDate <= new Date(vu.voucher.end_date) &&
        vu.status === VoucherUserStatusEnum.AVAILABLE
    }));

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

  async useVoucher(voucherId: string, userId: string): Promise<VoucherUser> {
    // Tìm đúng bản ghi voucher_user theo userId và voucherId
    const voucherUser = await this.voucherUserRepository.findOne({
      where: { user_id: userId, voucher_id: voucherId },
      relations: ['voucher'],
    });

    if (!voucherUser) {
      throw new NotFoundException('Không tìm thấy mã giảm giá cho user này');
    }

    if (voucherUser.status === VoucherUserStatusEnum.USED) {
      throw new BadRequestException('Mã giảm giá đã được sử dụng');
    }

    const currentDate = new Date();
    const isValid =
      currentDate >= new Date(voucherUser.voucher.start_date) &&
      currentDate <= new Date(voucherUser.voucher.end_date) &&
      voucherUser.status === VoucherUserStatusEnum.AVAILABLE;

    if (!isValid) {
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }

    voucherUser.status = VoucherUserStatusEnum.USED;
    voucherUser.used_at = new Date();
    return this.voucherUserRepository.save(voucherUser);
  }

  async deleteVoucherUser(voucherId: string, userId: string): Promise<void> {
    const result = await this.voucherUserRepository.delete({ voucher_id: voucherId, user_id: userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Bản ghi voucher-user với voucher_id ${voucherId} và user_id ${userId} không tồn tại`);
    }
  }

  // Add new method to update voucher usage
  async updateVoucherUsage(voucherId: string): Promise<void> {
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException(`Mã giảm giá với ID ${voucherId} không tồn tại`);
    }

    if (voucher.quantity <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết số lượng');
    }

    // Update quantity and usedCount
    voucher.quantity -= 1;
    voucher.usedCount += 1;

    await this.voucherRepository.save(voucher);
  }

  //#region exchangeVoucherByPoint
  /**
   * Đổi thưởng: user dùng điểm để đổi lấy voucher
   */
  async exchangeVoucherByPoint(userId: string, voucherId: string): Promise<VoucherUser> {
    // 1. Lấy thông tin voucher
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) throw new NotFoundException('Voucher không tồn tại');
    if (voucher.status !== VoucherStatusEnum.ACTIVE) throw new BadRequestException('Voucher không còn hiệu lực');
    if (voucher.quantity <= 0) throw new BadRequestException('Voucher đã hết số lượng');
    if (!voucher.point || voucher.point <= 0) throw new BadRequestException('Voucher này không hỗ trợ đổi điểm');

    // 2. Kiểm tra user có đủ điểm và chưa sở hữu voucher này
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    const hasEnoughPoints = await this.pointHelperService.checkUserBalance(userId, voucher.point);
    if (!hasEnoughPoints) {
      const currentBalance = await this.pointHelperService.getUserBalance(userId);
      throw new BadRequestException(`Bạn không đủ điểm để đổi voucher này. Hiện tại: ${currentBalance}, cần: ${voucher.point}`);
    }

    const existingVoucherUser = await this.voucherUserRepository.findOne({ where: { user_id: userId, voucher_id: voucherId } });
    if (existingVoucherUser) throw new BadRequestException('Bạn đã sở hữu voucher này');

    // 3. Trừ điểm sử dụng PointHelperService
    await this.pointHelperService.handleVoucherRedemption(
      userId,
      voucher.point,
      `${voucher.code} - ${voucher.description}`
    );

    // 4. Gửi thông báo trừ điểm ngay sau khi trừ điểm thành công
    try {
      await this.notificationService.notifyPointDeduction(user, voucher.point, `đổi voucher "${voucher.code}"`);
      this.logger.log(`Gửi thông báo trừ điểm thành công cho user ${userId}, trừ ${voucher.point} điểm`);
    } catch (error) {
      this.logger.warn(`Gửi thông báo trừ điểm không thành công cho user ${userId}: ${error.message}`);
      // Không throw error để không ảnh hưởng đến quá trình đổi voucher
    }

    // 5. Gán voucher cho user với from = 'đổi điểm'
    const voucherUser = this.voucherUserRepository.create({
      user_id: userId,
      voucher_id: voucherId,
      status: VoucherUserStatusEnum.AVAILABLE,
      from: VoucherUserFromEnum.POINT_REDEEM,
      assigned_at: new Date(),
      used_at: null,
    });
    await this.voucherUserRepository.save(voucherUser);

    // 6. Giảm số lượng voucher
    voucher.quantity -= 1;
    await this.voucherRepository.save(voucher);

    // 7. Gửi thông báo đổi voucher thành công sau khi hoàn thành
    try {
      await this.notificationService.notifyVoucherExchange(user, voucher.code);
      this.logger.log(`Gửi thông báo đổi voucher thành công cho user ${userId}, voucher: ${voucher.code}`);
    } catch (error) {
      this.logger.warn(`Gửi thông báo đổi voucher không thành công cho user ${userId}: ${error.message}`);
      // Không throw error để không ảnh hưởng đến quá trình đổi voucher
    }

    return voucherUser;
  }
  //#endregion exchangeVoucherByPoint

  //#endregion VoucherUser Operations

  //#region VoucherUser Campaign Operations
  async findVoucherByCampaign(userId: string, query: FindVoucherDto): Promise<{
    data: any[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    // 1. Lấy thông tin user
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'fullName', 'phoneNumber', 'avatarUrl', 'status', 'rank', 'multiplier', 'lastLoginAt', 'createdAt', 'updatedAt']
    });

    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }

    // 2. Tạo query builder cho voucher từ campaign
    const queryBuilder = this.voucherRepository.createQueryBuilder('voucher')
      .innerJoin('campaign_voucher', 'cv', 'cv.voucherId = voucher.id')
      .innerJoin('campaign', 'c', 'c.id = cv.campaignId')
      .innerJoin('user_campaign', 'uc', 'uc.campaignId = c.id')
      .addSelect([
        'cv.assigned_at as campaign_assigned_at',
        'cv.isavailable as campaign_is_available',
        'uc.joined_at as user_joined_at',
        'uc.isavailable as user_campaign_available'
      ])
      .where('uc.userId = :userId', { userId })
      .andWhere('cv.isavailable = :isAvailable', { isAvailable: true })
      .andWhere('uc.isavailable = :userCampaignAvailable', { userCampaignAvailable: true });

    // 3. Thêm filter theo term (tìm kiếm)
    if (query.term) {
      // Tách từ khóa tìm kiếm thành các từ riêng biệt
      const searchTerms = query.term.trim().split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        const conditions = searchTerms.map((term, index) => {
          const paramName = `term${index}`;
          return `(voucher.code ILIKE :${paramName} OR voucher.discount_type::text ILIKE :${paramName} OR voucher.status::text ILIKE :${paramName})`;
        });

        const params = {};
        searchTerms.forEach((term, index) => {
          params[`term${index}`] = `%${term}%`;
        });

        queryBuilder.andWhere(`(${conditions.join(' AND ')})`, params);
      }
    }

    // 4. Thêm filter theo trạng thái voucher
    const currentDate = new Date();
    if (query.status) {
      if (query.status === VoucherStatusEnum.ACTIVE) {
        queryBuilder.andWhere('voucher.status = :voucherStatus', { voucherStatus: VoucherStatusEnum.ACTIVE })
          .andWhere('voucher.start_date <= :currentDate', { currentDate })
          .andWhere('voucher.end_date >= :currentDate', { currentDate });
      } else if (query.status === VoucherStatusEnum.EXPIRED) {
        queryBuilder.andWhere('(voucher.status != :voucherStatus OR voucher.end_date < :currentDate)', { voucherStatus: VoucherStatusEnum.ACTIVE, currentDate });
      } else if (query.status === VoucherStatusEnum.INACTIVE) {
        queryBuilder.andWhere('voucher.status != :voucherStatus', { voucherStatus: VoucherStatusEnum.ACTIVE });
      }
    }

    // 5. Sắp xếp
    const allowedSortFields = ['createdAt', 'updatedAt', 'code', 'discount_value', 'status', 'start_date', 'end_date'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Xử lý sắp xếp theo maxPrice
    if (query.sortBy === 'maxPrice') {
      queryBuilder.orderBy('voucher.maxPrice', sortDirection);
    } else {
      queryBuilder.orderBy(`voucher.${sortField}`, sortDirection);
    }

    // 6. Phân trang
    queryBuilder.skip(skip).take(pageSize);

    // 7. Thực hiện query
    const rawData = await queryBuilder.getRawMany();
    const totalItem = await queryBuilder.getCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    // 8. Transform data để có cấu trúc tương tự VoucherUser
    const data = rawData.map((row: any) => {
      const currentDate = new Date();
      const is_valid =
        currentDate >= new Date(row.voucher_start_date) &&
        currentDate <= new Date(row.voucher_end_date) &&
        row.voucher_status === VoucherStatusEnum.ACTIVE;

      return {
        voucher_id: row.voucher_id,
        user_id: user.id,
        status: 'có sẵn', // Campaign vouchers luôn có sẵn cho user đã join
        assigned_at: row.campaign_assigned_at,
        used_at: null, // Campaign vouchers chưa được sử dụng
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
          status: user.status,
          rank: user.rank,
          multiplier: user.multiplier,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        voucher: {
          id: row.voucher_id,
          code: row.voucher_code,
          description: row.voucher_description,
          discount_type: row.voucher_discount_type,
          discount_value: row.voucher_discount_value,
          minPrice: row.voucher_minprice,
          maxPrice: row.voucher_maxprice,
          quantity: row.voucher_quantity,
          usedCount: row.voucher_usedcount,
          type: row.voucher_type,
          point: row.voucher_point,
          start_date: row.voucher_start_date,
          end_date: row.voucher_end_date,
          status: row.voucher_status,
          created_at: row.voucher_created_at,
          updated_at: row.voucher_updated_at
        },
        is_valid,
        campaign_info: {
          campaign_assigned_at: row.campaign_assigned_at,
          campaign_is_available: row.campaign_is_available,
          user_joined_at: row.user_joined_at,
          user_campaign_available: row.user_campaign_available
        }
      };
    });

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

  /**
   * Check if a voucher is from a campaign and if the user has joined that campaign
   * @param voucherId string
   * @param userId string
   * @returns {Promise<boolean>} true if voucher is from a campaign and user joined, false otherwise
   */
  async isVoucherFromCampaignAndUserJoined(voucherId: string, userId: string): Promise<boolean> {
    // Check if voucher is in a campaign
    const campaignVoucher = await this.campaignVoucherRepository.findOne({
      where: { voucherId, isAvailable: true },
      relations: ['campaign'],
    });
    if (!campaignVoucher) return false;

    // Check if user joined the campaign
    const userCampaign = await this.userCampaignRepository.findOne({
      where: { userId, campaignId: campaignVoucher.campaignId, isAvailable: true },
    });
    return !!userCampaign;
  }
  //#endregion VoucherUser Campaign Operations
}