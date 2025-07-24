import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignVoucher } from './entities/campaign-voucher.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { LoyaltyCampaign } from './entities/loyalty-campaign.entity';
import { FindAllDto, FindAllVendorWithInvitedDto } from './dto/find-all.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateLoyaltyCampaignDto } from './dto/create-loyalty-campaign.dto';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { User } from '../users/entities/user.entity';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { CreateMultipleUserCampaignDto } from './dto/create-user-campaign.dto';
import { CampaignVoucherStatusDto, UpdateCampaignStatusDto, UpdateUserCampaignStatusDto } from './dto/update-status.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { VoucherStatusEnum, VoucherUserStatusEnum, VoucherUserFromEnum, VoucherTypePoint } from 'src/constants/voucher.enum';
import { CAMPAIGN_NAMES, VOUCHER_CODES, CampaignStatus } from 'src/constants/campaign.enum';
import { CampaignVendor } from './entities/campaign-vendor.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { InviteVendorDto } from './dto/invite-vendor.dto';
import { ConfirmVendorInviteDto } from './dto/confirm-vendor-invite.dto';
import { MailService } from 'src/3rdService/mail/mail.service';
import { Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';

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
    @InjectRepository(CampaignVendor)
    private campaignVendorRepository: Repository<CampaignVendor>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    private readonly mailService: MailService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) { }

  // Campaign endpoints
  async findAllCampaigns(findAllDto: FindAllDto): Promise<{
    data: any[], // Đổi sang any để trả về đúng format UI
    pagination: {
      current: number,
      pageSize: number,
      totalPage: number,
      totalItem: number,
    }
  }> {
    const { name, status, startDate, endDate, current, pageSize, sortBy, sortDirection, showAll } = findAllDto;

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
      // Nếu không phải admin (showAll !== 'true') thì chỉ lấy campaign đang hoạt động
      if (showAll !== 'true') {
        q.andWhere('campaign.status = :activeStatus', { activeStatus: true });
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

    // Tính toán response đúng format UI
    const data = campaigns.map(campaign => {
      const now = new Date();
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);

      // Tính happenned
      let happened = '';
      if (now < startDate) happened = 'Sắp diễn ra';
      else if (now > endDate) happened = 'Đã kết thúc';
      else happened = 'Đang diễn ra';

      // Tính progress
      let progress = 0;
      if (now <= startDate) progress = 0;
      else if (now >= endDate) progress = 100;
      else progress = Math.round(((now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100);

      // Tính voucher
      const totalVoucher = campaign.campaignVouchers?.reduce((sum, cv) => sum + (cv.voucher?.quantity || 0), 0) || 0;
      const usedVoucher = campaign.campaignVouchers?.reduce((sum, cv) => sum + (cv.voucher?.usedCount || 0), 0) || 0;
      const remainingVoucher = totalVoucher - usedVoucher;

      return {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        happened,
        progress,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        totalVoucher,
        usedVoucher,
        remainingVoucher,
      };
    });

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

  async createCampaign(createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const { startDate, endDate, ...rest } = createCampaignDto;

    // Validate dates
    if (new Date(this.convertDateFormat(startDate)) > new Date(this.convertDateFormat(endDate))) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    // Tạo campaign trước
    const campaign = this.campaignRepository.create({
      ...rest,
      startDate: this.convertDateFormat(startDate),
      endDate: this.convertDateFormat(endDate),
      status: false,
    });
    const savedCampaign = await this.campaignRepository.save(campaign);

    // Lấy toàn bộ vendor và tạo campaignVendor
    const vendors = await this.vendorRepository.find();
    for (const vendor of vendors) {
      const campaignVendor = this.campaignVendorRepository.create({
        campaign: savedCampaign,
        vendor: vendor,
        isAvailable: false,
        invited: false,
      });
      await this.campaignVendorRepository.save(campaignVendor);
    }

    return savedCampaign;
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

    // Check if voucher exists and is of CAMPAIGN type
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại');
    }

    // Validate voucher type for campaign
    if (voucher.type !== VoucherTypePoint.CAMPAIGN) {
      throw new BadRequestException('Voucher này không phải loại chiến dịch');
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

    const savedCampaignVoucher = await this.campaignVoucherRepository.save(campaignVoucher);

    // Update campaign status to true after successfully adding voucher
    campaign.status = true;
    await this.campaignRepository.save(campaign);

    // Auto-assign voucher to all existing users in campaign
    const existingUserCampaigns = await this.userCampaignRepository.find({
      where: { campaignId, isAvailable: true },
    });

    for (const userCampaign of existingUserCampaigns) {
      // Check if voucher is still available and not expired
      if (voucher.quantity > 0 && voucher.status === VoucherStatusEnum.INACTIVE) {
        // Check if user already has this voucher
        const existingVoucherUser = await this.voucherUserRepository.findOne({
          where: { user_id: userCampaign.userId, voucher_id: voucherId }
        });

        if (!existingVoucherUser) {
          // Create voucher-user relationship with from = 'chiến dịch'
          const voucherUser = this.voucherUserRepository.create({
            user_id: userCampaign.userId,
            voucher_id: voucherId,
            status: VoucherUserStatusEnum.AVAILABLE,
            from: VoucherUserFromEnum.CAMPAIGN,
            assigned_at: new Date(),
            used_at: null,
          });

          await this.voucherUserRepository.save(voucherUser);

          voucher.status = VoucherStatusEnum.ACTIVE;
          await this.voucherRepository.save(voucher);
        }
      }
    }

    return savedCampaignVoucher;
  }

  async createMultipleCampaignVouchers(campaignId: string, voucherIds: string[]): Promise<CampaignVoucher[]> {
    // Check if campaign exists
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign không tồn tại');
    }

    const results: CampaignVoucher[] = [];
    const errors: string[] = [];

    // Get existing users in campaign to assign vouchers later
    const existingUserCampaigns = await this.userCampaignRepository.find({
      where: { campaignId, isAvailable: true },
    });

    for (const voucherId of voucherIds) {
      try {
        // Check if voucher exists and is of CAMPAIGN type
        const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
        if (!voucher) {
          errors.push(`Voucher ${voucherId} không tồn tại`);
          continue;
        }

        // Validate voucher type for campaign
        if (voucher.type !== VoucherTypePoint.CAMPAIGN) {
          errors.push(`Voucher ${voucherId} không phải loại chiến dịch`);
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

        // Auto-assign voucher to all existing users in campaign
        for (const userCampaign of existingUserCampaigns) {
          // Check if voucher is still available and not expired
          if (voucher.quantity > 0 && voucher.status === VoucherStatusEnum.INACTIVE) {
            // Check if user already has this voucher
            const existingVoucherUser = await this.voucherUserRepository.findOne({
              where: { user_id: userCampaign.userId, voucher_id: voucherId }
            });

            if (!existingVoucherUser) {
              // Create voucher-user relationship with from = 'chiến dịch'
              const voucherUser = this.voucherUserRepository.create({
                user_id: userCampaign.userId,
                voucher_id: voucherId,
                status: VoucherUserStatusEnum.AVAILABLE,
                from: VoucherUserFromEnum.CAMPAIGN,
                assigned_at: new Date(),
                used_at: null,
              });

              await this.voucherUserRepository.save(voucherUser);

              // update voucher status to active
              voucher.status = VoucherStatusEnum.ACTIVE;
              await this.voucherRepository.save(voucher);
            }
          }
        }
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

    //update status of campaign
    campaign.status = true;
    await this.campaignRepository.save(campaign);

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

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Check if user is already in campaign
    const existingUserCampaign = await this.userCampaignRepository.findOne({
      where: { campaignId, userId },
    });
    if (existingUserCampaign) {
      throw new BadRequestException('User đã tham gia campaign này');
    }

    const userCampaign = this.userCampaignRepository.create({
      campaignId,
      userId,
      isAvailable: true,
    });

    const savedUserCampaign = await this.userCampaignRepository.save(userCampaign);

    // Auto-assign vouchers from campaign to user
    const campaignVouchers = await this.campaignVoucherRepository.find({
      where: { campaignId, isAvailable: true },
      relations: ['voucher'],
    });

    for (const campaignVoucher of campaignVouchers) {
      const voucher = campaignVoucher.voucher;

      // Check if voucher is still available and not expired
      if (voucher.quantity > 0 && voucher.status === VoucherStatusEnum.ACTIVE) {
        // Check if user already has this voucher
        const existingVoucherUser = await this.voucherUserRepository.findOne({
          where: { user_id: userId, voucher_id: voucher.id }
        });

        if (!existingVoucherUser) {
          // Create voucher-user relationship with from = 'chiến dịch'
          const voucherUser = this.voucherUserRepository.create({
            user_id: userId,
            voucher_id: voucher.id,
            status: VoucherUserStatusEnum.AVAILABLE,
            from: VoucherUserFromEnum.CAMPAIGN,
            assigned_at: new Date(),
            used_at: null,
          });

          await this.voucherUserRepository.save(voucherUser);
        }
      }
    }

    return savedUserCampaign;
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

    // Get campaign vouchers to assign to users
    const campaignVouchers = await this.campaignVoucherRepository.find({
      where: { campaignId, isAvailable: true },
      relations: ['voucher'],
    });

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

          // Auto-assign vouchers from campaign to user
          for (const campaignVoucher of campaignVouchers) {
            const voucher = campaignVoucher.voucher;

            // Check if voucher is still available and not expired
            if (voucher.quantity > 0 && voucher.status === VoucherStatusEnum.ACTIVE) {
              // Check if user already has this voucher
              const existingVoucherUser = await this.voucherUserRepository.findOne({
                where: { user_id: userId, voucher_id: voucher.id }
              });

              if (!existingVoucherUser) {
                // Create voucher-user relationship with from = 'chiến dịch'
                const voucherUser = this.voucherUserRepository.create({
                  user_id: userId,
                  voucher_id: voucher.id,
                  status: VoucherUserStatusEnum.AVAILABLE,
                  from: VoucherUserFromEnum.CAMPAIGN,
                  assigned_at: new Date(),
                  used_at: null,
                });

                await this.voucherUserRepository.save(voucherUser);
              }
            }
          }
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

  /**
   * Thêm user vào campaign "Chào Bạn Mới" (voucher chỉ được sử dụng thông qua campaign)
   */
  async joinWelcomeCampaign(userId: string, note?: string): Promise<{
    message: string;
    userCampaign: UserCampaign;
    voucherUser: VoucherUser;
  }> {
    // Sử dụng transaction để đảm bảo atomicity
    return await this.campaignRepository.manager.transaction(async (manager) => {
      // 1. Tìm campaign "Chào Bạn Mới"
      const campaign = await manager.findOne(Campaign, {
        where: { name: CAMPAIGN_NAMES.WELCOME }
      });

      if (!campaign) {
        throw new NotFoundException(`Campaign "${CAMPAIGN_NAMES.WELCOME}" không tồn tại`);
      }

      if (!campaign.status) {
        throw new BadRequestException(`Campaign "${CAMPAIGN_NAMES.WELCOME}" đã bị vô hiệu hóa`);
      }

      // 2. Kiểm tra thời gian campaign
      const now = new Date();
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);

      if (now < startDate) {
        throw new BadRequestException(`Campaign "${CAMPAIGN_NAMES.WELCOME}" chưa bắt đầu`);
      }

      if (now > endDate) {
        throw new BadRequestException(`Campaign "${CAMPAIGN_NAMES.WELCOME}" đã kết thúc`);
      }

      // 3. Tìm voucher "CHAOBANMOI" trong campaign
      const campaignVoucher = await manager.findOne(CampaignVoucher, {
        where: {
          campaignId: campaign.id,
          isAvailable: true
        },
        relations: ['voucher']
      });

      if (!campaignVoucher) {
        throw new NotFoundException(`Voucher "${VOUCHER_CODES.WELCOME}" không có trong campaign "${CAMPAIGN_NAMES.WELCOME}"`);
      }

      const voucher = campaignVoucher.voucher;
      if (!voucher) {
        throw new NotFoundException(`Voucher "${VOUCHER_CODES.WELCOME}" không tồn tại`);
      }

      // Validate voucher type for campaign
      if (voucher.type !== VoucherTypePoint.CAMPAIGN) {
        throw new BadRequestException(`Voucher "${VOUCHER_CODES.WELCOME}" không phải loại chiến dịch`);
      }

      if (voucher.status !== VoucherStatusEnum.ACTIVE) {
        throw new BadRequestException(`Voucher "${VOUCHER_CODES.WELCOME}" không còn hiệu lực`);
      }

      if (voucher.quantity <= 0) {
        throw new BadRequestException(`Voucher "${VOUCHER_CODES.WELCOME}" đã hết số lượng`);
      }

      // 4. Kiểm tra user có tồn tại không
      const user = await manager.findOne(User, {
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundException('User không tồn tại');
      }

      // 5. Kiểm tra user đã tham gia campaign chưa
      const existingUserCampaign = await manager.findOne(UserCampaign, {
        where: { campaignId: campaign.id, userId }
      });

      if (existingUserCampaign) {
        throw new BadRequestException(`User đã tham gia campaign "${CAMPAIGN_NAMES.WELCOME}"`);
      }

      // 6. Thêm user vào campaign
      const userCampaign = manager.create(UserCampaign, {
        campaignId: campaign.id,
        userId,
        isAvailable: true,
      });

      // 7. Tạo voucher-user record
      const voucherUser = manager.create(VoucherUser, {
        user_id: userId,
        voucher_id: voucher.id,
        status: VoucherUserStatusEnum.AVAILABLE,
        from: VoucherUserFromEnum.CAMPAIGN,
        assigned_at: new Date(),
        used_at: null,
      });

      const savedUserCampaign = await manager.save(UserCampaign, userCampaign);
      const savedVoucherUser = await manager.save(VoucherUser, voucherUser);

      return {
        message: `Thêm user vào campaign "${CAMPAIGN_NAMES.WELCOME}" thành công. Voucher "${VOUCHER_CODES.WELCOME}" đã được gán cho user.`,
        userCampaign: savedUserCampaign,
        voucherUser: savedVoucherUser
      };
    });
  }

  // CRUD cho campaign-vendor
  async createCampaignVendor(campaignId: string, vendorId: string) {
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign không tồn tại');
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor không tồn tại');
    const campaignVendor = this.campaignVendorRepository.create({ campaign, vendor, isAvailable: false, invited: false });
    return this.campaignVendorRepository.save(campaignVendor);
  }

  async getCampaignVendorById(id: string) {
    const campaignVendor = await this.campaignVendorRepository.findOne({ where: { id }, relations: ['campaign', 'vendor'] });
    if (!campaignVendor) throw new NotFoundException('CampaignVendor không tồn tại');
    return campaignVendor;
  }

  async updateCampaignVendor(id: string, vendorId: string, isAvailable: boolean) {
    const campaignVendor = await this.campaignVendorRepository.findOne({ where: { id } });
    if (!campaignVendor) throw new NotFoundException('CampaignVendor không tồn tại');
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor không tồn tại');
    campaignVendor.vendor = vendor;
    if (typeof isAvailable === 'boolean') campaignVendor.isAvailable = isAvailable;
    return this.campaignVendorRepository.save(campaignVendor);
  }

  async deleteCampaignVendor(id: string) {
    const campaignVendor = await this.campaignVendorRepository.findOne({ where: { id } });
    if (!campaignVendor) throw new NotFoundException('CampaignVendor không tồn tại');
    await this.campaignVendorRepository.remove(campaignVendor);
    return { message: 'Đã xóa campaign-vendor' };
  }

  // List campaign mà vendor đã tham gia hoặc tự tạo
  async findCampaignsByVendorId(vendorId: string, current = 1, pageSize = 10) {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor không tồn tại');
    const [campaignVendors, total] = await this.campaignVendorRepository.findAndCount({ where: { vendor: { id: vendorId } }, relations: ['campaign'], skip: (current - 1) * pageSize, take: pageSize });
    const data = campaignVendors.map(cv => cv.campaign);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total,
      }
    };
  }

  async getVendorInvitedByCampaignId(campaignId: string, query: FindAllVendorWithInvitedDto): Promise<{
    data: CampaignVendor[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const { isAvailable, invited, current = 1, pageSize = 10 } = query;
    const queryBuilder = this.campaignVendorRepository.createQueryBuilder('campaign_vendor')
      .leftJoinAndSelect('campaign_vendor.vendor', 'vendor')
      .where('campaign_vendor.campaign_id = :campaignId', { campaignId });

    function parseBool(val: any) {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
      }
      return undefined;
    }

    const isAvailableBool = parseBool(isAvailable);
    const invitedBool = parseBool(invited);

    if (isAvailableBool !== undefined) {
      queryBuilder.andWhere('campaign_vendor.is_available = :isAvailable', { isAvailable: isAvailableBool });
    }
    if (invitedBool !== undefined) {
      queryBuilder.andWhere('campaign_vendor.invited = :invited', { invited: invitedBool });
    }
    const total = await queryBuilder.getCount();
    const skip = (current - 1) * pageSize;
    const data = await queryBuilder.skip(skip).take(pageSize).getMany();
    return {
      data,
      pagination: { current, pageSize, totalPage: Math.ceil(total / pageSize), totalItem: total }
    };
  }

  async inviteVendorToCampaign(inviteVendorDto: InviteVendorDto) {
    const { campaignId, vendorId } = inviteVendorDto;
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign không tồn tại');
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId }, relations: ['user_id'] });
    if (!vendor) throw new NotFoundException('Vendor không tồn tại');
    if (!vendor.user_id || !vendor.user_id.email) throw new BadRequestException('Vendor chưa liên kết user hoặc thiếu email');

    // Update hoặc tạo mới campaign-vendor với invited = true, isAvailable = false
    let campaignVendor = await this.campaignVendorRepository.findOne({ where: { campaign: { id: campaignId }, vendor: { id: vendorId } }, relations: ['campaign', 'vendor'] });
    if (!campaignVendor) {
      campaignVendor = this.campaignVendorRepository.create({ campaign, vendor, invited: true, isAvailable: false });
    } else {
      campaignVendor.invited = true;
      campaignVendor.isAvailable = false;
    }
    await this.campaignVendorRepository.save(campaignVendor);

    // Sinh token ngẫu nhiên
    const token = randomBytes(32).toString('hex');
    // Lưu vào Redis với TTL 15 phút
    await this.redisClient.setex(
      `campaign-invite:${token}`,
      900, // 15 phút
      JSON.stringify({ campaignId, vendorId })
    );
    // Link xác nhận
    const confirmLink = `${'https://photogo.id.vn'}/campaigns/confirm-invite?token=${token}`;
    // Gửi mail
    await this.mailService.sendMail(
      vendor.user_id.email,
      'Mời xác nhận tham gia chiến dịch PhotoGo',
      'invite-vendor-campaign',
      {
        vendorName: vendor.name,
        campaignName: campaign.name,
        confirmLink,
      },
    );
    return { message: 'Đã gửi mail xác nhận cho vendor', email: vendor.user_id.email, token };
  }

  async confirmVendorInvite(token: string) {
    console.log('Xác nhận token:', token);
    // Lấy thông tin từ Redis
    const key = `campaign-invite:${token}`;
    const data = await this.redisClient.get(key);
    console.log('Dữ liệu lấy từ Redis:', data);
    if (!data) throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    const { campaignId, vendorId } = JSON.parse(data);
    // Xóa token khỏi Redis sau khi xác nhận
    await this.redisClient.del(key);
    // Kiểm tra campaign-vendor đã tồn tại chưa
    let campaignVendor = await this.campaignVendorRepository.findOne({ where: { campaign: { id: campaignId }, vendor: { id: vendorId } }, relations: ['campaign', 'vendor'] });
    if (!campaignVendor) {
      // Nếu chưa có thì tạo mới
      const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
      const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
      if (!campaign || !vendor) throw new NotFoundException('Campaign hoặc Vendor không tồn tại');
      campaignVendor = this.campaignVendorRepository.create({ campaign, vendor, isAvailable: true, invited: true });
      await this.campaignVendorRepository.save(campaignVendor);
    } else {
      // Nếu đã có thì cập nhật trạng thái
      campaignVendor.isAvailable = true;
      campaignVendor.invited = true;
      await this.campaignVendorRepository.save(campaignVendor);
    }
    return { message: 'Xác nhận tham gia campaign thành công', campaignId, vendorId };
  }

  async getCampaignById(id: string) {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign không tồn tại');
    return campaign;
  }

  async removeVoucherOutOfCampaign(campaignId: string, voucherId: string) {
    const campaignVoucher = await this.campaignVoucherRepository.findOne({ where: { campaignId, voucherId } });
    if (!campaignVoucher) throw new NotFoundException('Campaign voucher không tồn tại');

    // Sử dụng delete với điều kiện thay vì object
    const result = await this.campaignVoucherRepository.delete({ campaignId, voucherId });

    if (result.affected === 0) {
      throw new NotFoundException('Campaign voucher không tồn tại');
    }

    return { message: 'Xóa voucher khỏi campaign thành công' };
  }

  /**
   * Helper method to create a voucher with CAMPAIGN type
   * @param voucherData Partial voucher data
   * @returns Promise<Voucher>
   */
  async createVoucherWithCampaignType(voucherData: Partial<Voucher>): Promise<Voucher> {
    const voucher = this.voucherRepository.create({
      ...voucherData,
      type: VoucherTypePoint.CAMPAIGN, // Always set type to CAMPAIGN for campaign vouchers
    });
    return this.voucherRepository.save(voucher);
  }

  /**
   * Helper method to validate voucher is of CAMPAIGN type
   * @param voucherId string
   * @returns Promise<boolean>
   */
  async validateCampaignVoucher(voucherId: string): Promise<boolean> {
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    return voucher?.type === VoucherTypePoint.CAMPAIGN;
  }

  /**
   * Get available vouchers with CAMPAIGN type that can be added to campaigns
   */
  async getAvailableCampaignVouchers(): Promise<Voucher[]> {
    return this.voucherRepository.createQueryBuilder('voucher')
      .leftJoin('campaign_voucher', 'cv', 'cv.voucherId = voucher.id')
      .where('voucher.type = :voucherType', { voucherType: VoucherTypePoint.CAMPAIGN })
      .andWhere('voucher.status IN (:...status)', { status: [VoucherStatusEnum.INACTIVE] })
      .andWhere('voucher.quantity > 0')
      .andWhere('cv.voucherId IS NULL') // Loại bỏ voucher đã có trong campaign
      .getMany();
  }

  async getAllCampaignsAndVouchersIn(): Promise<{ data: Campaign[], pagination: { current: number, pageSize: number, totalPage: number, totalItem: number } }> {
    const [campaigns, total] = await this.campaignRepository.findAndCount({ where: { 
      status: true,
      name: Not(CAMPAIGN_NAMES.WELCOME)
    }, relations: ['campaignVouchers', 'campaignVouchers.voucher'] });
    return { data: campaigns, pagination: { current: 1, pageSize: 10, totalPage: Math.ceil(total / 10), totalItem: total } };
  }

  // List campaigns that a user has joined
  async findCampaignsByUserId(userId: string, paginationDto: PaginationDto) {
    const { current = 1, pageSize = 10 } = paginationDto;
    // Kiểm tra user tồn tại
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    // Lấy các userCampaign theo userId
    const [userCampaigns, total] = await this.userCampaignRepository.findAndCount({
      where: { userId, isAvailable: true },
      relations: ['campaign'],
      skip: (current - 1) * pageSize,
      take: pageSize,
      order: { joinedAt: 'DESC' },
    });
    // Lấy danh sách campaign từ userCampaigns
    const data = userCampaigns.map(uc => uc.campaign);
    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItem: total,
      }
    };
  }
} 