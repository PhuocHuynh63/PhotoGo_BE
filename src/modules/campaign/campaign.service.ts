import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignVoucher } from './entities/campaign-voucher.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { LoyaltyCampaign } from './entities/loyalty-campaign.entity';
import { FindAllDto } from './dto/find-all.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateLoyaltyCampaignDto } from './dto/create-loyalty-campaign.dto';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { User } from '../users/entities/user.entity';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { CreateMultipleUserCampaignDto } from './dto/create-user-campaign.dto';
import { CampaignVoucherStatusDto, UpdateCampaignStatusDto, UpdateUserCampaignStatusDto } from './dto/update-status.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';

@Injectable()
export class CampaignService {
    private convertDateFormat(dateStr: string): string {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    private formatDate(date: Date): string {
        if (!date) return null;
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignVoucher)
    private campaignVoucherRepository: Repository<CampaignVoucher>,
    @InjectRepository(UserCampaign)
    private userCampaignRepository: Repository<UserCampaign>,
    @InjectRepository(LoyaltyCampaign)
    private loyaltyCampaignRepository: Repository<LoyaltyCampaign>,
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(VoucherUser)
    private voucherUserRepository: Repository<VoucherUser>,
  ) {}

  // Campaign endpoints
  async findAllCampaigns(findAllDto: FindAllDto): Promise<{ 
    data: CampaignResponseDto[], 
    pagination: {
      current: number,
      pageSize: number,
      totalPage: number,
      totalItem: number,
    } 
  }> {
    const { name, status, startDate, endDate, current, pageSize, sortBy, sortDirection } = findAllDto;
  
    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }
  
    // Create base query for counting total campaigns
    const countQuery = this.campaignRepository.createQueryBuilder('campaign');
  
    // Create main query with joins
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.campaignVouchers', 'campaignVoucher')
      .leftJoinAndSelect('campaignVoucher.voucher', 'voucher')
      .leftJoinAndSelect('campaign.userCampaigns', 'userCampaign')
      .leftJoinAndSelect('userCampaign.user', 'user');
  
    // Add sorting with validation
    const validSortDirections = ['ASC', 'DESC'];
    const defaultSortDirection = 'DESC';
    
    // Validate and sanitize sortBy
    const sortFieldMap = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      startDate: 'startDate',
      endDate: 'endDate',
      status: 'status',
    };
    const finalSortBy = sortFieldMap[sortBy] || 'createdAt';
    const finalSortDirection = validSortDirections.includes(sortDirection?.toUpperCase()) 
      ? sortDirection.toUpperCase() 
      : defaultSortDirection;
  
    // Add conditions to both queries
    const addConditions = (q) => {
      if (name) {
        q.andWhere('campaign.name ILIKE :name', { name: `%${name}%` });
      }
      if (status !== undefined) {
        q.andWhere('campaign.status = :status', { status });
      }
      if (startDate) {
        q.andWhere('campaign.startDate >= :startDate', { startDate: this.convertDateFormat(startDate) });
      }
      if (endDate) {
        q.andWhere('campaign.endDate <= :endDate', { endDate: this.convertDateFormat(endDate) });
      }
    };
  
    addConditions(countQuery);
    addConditions(query);
  
    // Add order by with correct column name
    query.addOrderBy(`campaign.${finalSortBy}`, finalSortDirection as 'ASC' | 'DESC');
  
    const total = await countQuery.getCount();
    const skip = (current - 1) * pageSize;
  
    query.skip(skip).take(pageSize);
  
    const campaigns = await query.getMany();
  
    return {
      data: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        vouchers: campaign.campaignVouchers?.map(cv => ({
          id: cv.voucher.id,
          code: cv.voucher.code,
          description: cv.voucher.description,
          discount_type: cv.voucher.discount_type,
          discount_value: cv.voucher.discount_value,
          minPrice: cv.voucher.minPrice,
          maxPrice: cv.voucher.maxPrice,
          quantity: cv.voucher.quantity,
          usedCount: cv.voucher.usedCount,
          point: cv.voucher.point
        })) || [],
        users: campaign.userCampaigns?.map(uc => ({
          id: uc.user.id,
          fullName: uc.user.fullName,
          email: uc.user.email,
          phoneNumber: uc.user.phoneNumber,
          status: uc.user.status,
          rank: uc.user.rank
        })) || []
      })),
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total,
      },
    };
  }

  async createCampaign(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const { startDate, endDate, ...rest } = createCampaignDto;

    // Validate dates
    if (new Date(this.convertDateFormat(startDate)) > new Date(this.convertDateFormat(endDate))) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    const campaign = this.campaignRepository.create({
      ...rest,
      startDate: this.convertDateFormat(startDate),
      endDate: this.convertDateFormat(endDate),
    });

    return this.campaignRepository.save(campaign);
  }

  // Campaign Voucher endpoints
  async findCampaignVouchers(
    campaignId: string,
    paginationDto: PaginationDto
  ): Promise<{ 
    campaign: Partial<Campaign>,
    vouchers: Array<{
      voucherId: string;
      assignedAt: Date;
      isAvailable: boolean;
      voucher: Voucher;
    }>,
    pagination: {
      current: number,
      pageSize: number,
      totalPage: number,
      totalItem: number,
    }
  }> {
    // First get campaign info
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    // Then get vouchers with pagination
    const query = this.campaignVoucherRepository.createQueryBuilder('campaignVoucher')
      .leftJoinAndSelect('campaignVoucher.voucher', 'voucher')
      .where('campaignVoucher.campaignId = :campaignId', { campaignId });

    // Add sorting
    if (paginationDto.sortBy && paginationDto.sortDirection) {
      const validSortDirections = ['ASC', 'DESC'];
      const sortDirection = validSortDirections.includes(paginationDto.sortDirection.toUpperCase()) 
        ? paginationDto.sortDirection.toUpperCase() 
        : 'DESC';
      
      query.orderBy(`campaignVoucher.${paginationDto.sortBy}`, sortDirection as 'ASC' | 'DESC');
    } else {
      // Default sorting by assignedAt DESC
      query.orderBy('campaignVoucher.assignedAt', 'DESC');
    }

    const total = await query.getCount();
    const { current = 1, pageSize = 10 } = paginationDto;
    const skip = (current - 1) * pageSize;

    const vouchers = await query
      .skip(skip)
      .take(pageSize)
      .getMany();

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      },
      vouchers: vouchers.map(voucher => ({
        voucherId: voucher.voucherId,
        assignedAt: voucher.assignedAt,
        isAvailable: voucher.isAvailable,
        voucher: voucher.voucher
      })),
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total,
      }
    };
  }

  async createCampaignVoucher(data: { campaignId: string; voucherId: string }): Promise<CampaignVoucher> {
    const { campaignId, voucherId } = data;

    // Check if campaign exists
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    // Check if voucher exists (you might need to inject VoucherRepository)
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại');
    }

    // Check if voucher is already assigned to any user
    const voucherUser = await this.voucherUserRepository.findOne({
      where: { voucher_id: voucherId },
      relations: ['user'],
    });
    if (voucherUser) {
      throw new BadRequestException(`Voucher đã được assign cho user "${voucherUser.user.fullName}" (${voucherUser.user.email})`);
    }

    // Check if the relationship already exists
    const existing = await this.campaignVoucherRepository.findOne({
      where: { campaignId, voucherId },
    });
    if (existing) {
      throw new BadRequestException('Voucher đã được thêm vào campaign này');
    }

    const campaignVoucher = this.campaignVoucherRepository.create({
      campaignId,
      voucherId,
      isAvailable: true,
    });

    return this.campaignVoucherRepository.save(campaignVoucher);
  }

  async createMultipleCampaignVouchers(campaignId: string, voucherIds: string[]): Promise<CampaignVoucher[]> {
    // Check if campaign exists
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    const results: CampaignVoucher[] = [];
    const errors: string[] = [];

    for (const voucherId of voucherIds) {
      try {
        // Check if voucher exists
        const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
        if (!voucher) {
          errors.push(`Voucher ${voucherId} không tồn tại`);
          continue;
        }

        // Check if voucher is already assigned to any user
        const voucherUser = await this.voucherUserRepository.findOne({
          where: { voucher_id: voucherId },
          relations: ['user'],
        });
        if (voucherUser) {
          errors.push(`Voucher ${voucherId} đã được assign cho user "${voucherUser.user.fullName}" (${voucherUser.user.email})`);
          continue;
        }

        // Check if the relationship already exists
        const existing = await this.campaignVoucherRepository.findOne({
          where: { campaignId, voucherId },
        });
        if (existing) {
          errors.push(`Voucher ${voucherId} đã được thêm vào campaign này`);
          continue;
        }

        const campaignVoucher = this.campaignVoucherRepository.create({
          campaignId,
          voucherId,
          isAvailable: true,
        });

        const saved = await this.campaignVoucherRepository.save(campaignVoucher);
        results.push(saved);
      } catch (error) {
        errors.push(`Lỗi khi thêm voucher ${voucherId}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Một số voucher không thể thêm vào campaign',
        errors,
        successfulVouchers: results,
      });
    }

    return results;
  }

  // User Campaign endpoints
  async findAllUserCampaigns(
    campaignId: string,
    paginationDto: PaginationDto
  ): Promise<{ 
    campaign: Partial<Campaign>;
    userCampaigns: Array<{
      userId: string;
      isAvailable: boolean;
      joinedAt: Date;
      user: {
        id: string;
        email: string;
        fullName: string;
      };
    }>;
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    // First get campaign info
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    // Then get user campaigns with pagination
    const query = this.userCampaignRepository.createQueryBuilder('userCampaign')
      .leftJoinAndSelect('userCampaign.user', 'user')
      .where('userCampaign.campaignId = :campaignId', { campaignId });

    // Add sorting
    if (paginationDto.sortBy && paginationDto.sortDirection) {
      const validSortDirections = ['ASC', 'DESC'];
      const sortDirection = validSortDirections.includes(paginationDto.sortDirection.toUpperCase()) 
        ? paginationDto.sortDirection.toUpperCase() 
        : 'DESC';
      
      query.orderBy(`userCampaign.${paginationDto.sortBy}`, sortDirection as 'ASC' | 'DESC');
    } else {
      // Default sorting by joinedAt DESC
      query.orderBy('userCampaign.joinedAt', 'DESC');
    }

    const total = await query.getCount();
    const { current = 1, pageSize = 10 } = paginationDto;
    const skip = (current - 1) * pageSize;

    const userCampaigns = await query
      .skip(skip)
      .take(pageSize)
      .getMany();

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      },
      userCampaigns: userCampaigns.map(uc => ({
        userId: uc.userId,
        isAvailable: uc.isAvailable,
        joinedAt: uc.joinedAt,
        user: {
          id: uc.user.id,
          email: uc.user.email,
          fullName: uc.user.fullName
        }
      })),
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total
      }
    };
  }

  async createUserCampaign(data: { campaignId: string; userId: string }): Promise<UserCampaign> {
    const { campaignId, userId } = data;

    // Check if campaign exists
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    // Check if user exists (you might need to inject UserRepository)
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Check if the relationship already exists
    const existing = await this.userCampaignRepository.findOne({
      where: { campaignId, userId },
    });
    if (existing) {
      throw new BadRequestException('User đã tham gia campaign này');
    }

    const userCampaign = this.userCampaignRepository.create({
      campaignId,
      userId,
      isAvailable: true,
    });

    return this.userCampaignRepository.save(userCampaign);
  }

  async createMultipleUserCampaigns(
    campaignId: string,
    createMultipleUserCampaignDto: CreateMultipleUserCampaignDto,
  ): Promise<{ message: string; errors: string[]; successfulUsers: string[] }> {
    const { userIds } = createMultipleUserCampaignDto;
    const errors: string[] = [];
    const successfulUsers: string[] = [];

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('Danh sách user không được để trống');
    }

    // Check if campaign exists and is active
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    if (!campaign.status) {
      throw new BadRequestException('Campaign đã bị vô hiệu hóa');
    }

    // Check campaign date validity
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    if (this.formatDate(startDate) && this.formatDate(startDate) > this.formatDate(now)) {
      throw new BadRequestException('Campaign chưa bắt đầu');
    }
    if (this.formatDate(endDate) && this.formatDate(endDate) < this.formatDate(now)) {
      throw new BadRequestException('Campaign đã kết thúc');
    }

    // Check if all users exist
    const existingUsers = await this.userRepository.find({
      where: { id: In(userIds) },
    });

    const existingUserIds = existingUsers.map(user => user.id);
    const nonExistentUserIds = userIds.filter(id => !existingUserIds.includes(id));
    
    if (nonExistentUserIds.length > 0) {
      nonExistentUserIds.forEach(userId => {
        errors.push(`User ${userId} không tồn tại`);
      });
    }

    // Process existing users
    for (const userId of existingUserIds) {
      try {
        // Check if user is already in campaign
        const existingUserCampaign = await this.userCampaignRepository.findOne({
          where: {
            campaignId,
            userId,
          },
        });

        if (existingUserCampaign) {
          errors.push(`User ${userId} đã tham gia campaign này`);
          continue;
        }

        // Create new user campaign
        const userCampaign = this.userCampaignRepository.create({
          campaignId,
          userId,
          isAvailable: true,
        });

        const savedUserCampaign = await this.userCampaignRepository.save(userCampaign);
        if (savedUserCampaign) {
          successfulUsers.push(userId);
        }
      } catch (error) {
        if (error.code === '23503') { // Foreign key violation
          errors.push(`User ${userId} không tồn tại trong hệ thống`);
        } else {
          errors.push(`Lỗi khi thêm user ${userId}: ${error.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        message: 'Một số user không thể thêm vào campaign',
        errors,
        successfulUsers,
      };
    }

    return {
      message: 'Thêm tất cả users thành công',
      errors: [],
      successfulUsers,
    };
  }

  // Loyalty Campaign endpoints
  async findAllLoyaltyCampaigns(findAllDto: FindAllDto): Promise<{ 
    data: LoyaltyCampaign[], 
    pagination: {
      current: number,
      pageSize: number,
      totalPage: number,
      totalItem: number,
    } 
  }> {
    const { name, status } = findAllDto;
    const query = this.loyaltyCampaignRepository.createQueryBuilder('loyaltyCampaign');

    if (name) {
      query.andWhere('loyaltyCampaign.name ILIKE :name', { name: `%${name}%` });
    }
    if (status) {
      query.andWhere('loyaltyCampaign.tier = :status', { status });
    }

    const total = await query.getCount();
    const { current = 1, pageSize = 10 } = findAllDto;
    const skip = (current - 1) * pageSize;

    query.skip(skip).take(pageSize);

    const data = await query.getMany();

    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total,
      },
    };
  }

  async createLoyaltyCampaign(createLoyaltyCampaignDto: CreateLoyaltyCampaignDto): Promise<LoyaltyCampaign> {
    const loyaltyCampaign = this.loyaltyCampaignRepository.create(createLoyaltyCampaignDto);
    return this.loyaltyCampaignRepository.save(loyaltyCampaign);
  }

  // Update campaign status
  async updateCampaignStatus(campaignId: string, updateCampaignStatusDto: UpdateCampaignStatusDto): Promise<Campaign> {
    const { status } = updateCampaignStatusDto;
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }
    campaign.status = status;
    return this.campaignRepository.save(campaign);
  }

  // Update user campaign status
  async updateUserCampaignStatus(campaignId: string, userId: string, updateUserCampaignStatusDto: UpdateUserCampaignStatusDto): Promise<UserCampaign> {
    const { status } = updateUserCampaignStatusDto;
    const userCampaign = await this.userCampaignRepository.findOne({ where: { campaignId, userId } });
    if (!userCampaign) {
      throw new NotFoundException('User campaign không tồn tại');
    }
    userCampaign.isAvailable = status;
    return this.userCampaignRepository.save(userCampaign);
  }

  // Update campaign voucher status
  async updateCampaignVoucherStatus(campaignId: string, voucherId: string, updateCampaignVoucherStatusDto: CampaignVoucherStatusDto): Promise<CampaignVoucher> {
    const { status } = updateCampaignVoucherStatusDto;
    const campaignVoucher = await this.campaignVoucherRepository.findOne({ where: { campaignId, voucherId } });
    if (!campaignVoucher) {
      throw new NotFoundException('Campaign voucher không tồn tại');
    }
    campaignVoucher.isAvailable = status;
    return this.campaignVoucherRepository.save(campaignVoucher);
  }
  
} 