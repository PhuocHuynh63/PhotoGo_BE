import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionVendor } from './entities/subscription-vendor.entity';
import { CreateSubscriptionVendorDto, UpdateSubscriptionVendorDto, SubscriptionVendorResponseDto } from './dto/subscription-vendor.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { PlanType, BillingCycle } from 'src/constants/subscription.enum';
import { HistoryDto, PaginationDto } from '../subscription/dto/find-subscription.dto';
import { SubscriptionHistoryService } from './subscription-history.service';

@Injectable()
export class SubscriptionVendorService {
  constructor(
    @InjectRepository(SubscriptionVendor)
    private subscriptionVendorRepository: Repository<SubscriptionVendor>,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
  ) {}

  async create(createDto: CreateSubscriptionVendorDto): Promise<SubscriptionVendorResponseDto> {
    // Lấy plan để kiểm tra loại và duration
    const planRepo = this.subscriptionVendorRepository.manager.getRepository(SubscriptionPlan);
    const plan = await planRepo.findOne({ where: { id: createDto.planId } });
    if (!plan) throw new NotFoundException('Không tìm thấy subscription plan');
    if (plan.planType !== PlanType.VENDOR) {
      throw new Error('Chỉ được đăng ký gói dành cho vendor');
    }
    // Nếu plan là monthly và không có duration thì duration = 30 (nếu cần dùng duration ở đây)
    // Kiểm tra xem vendor có thể tham gia subscription plan không
    const canJoin = await this.canVendorJoinPlan(createDto.vendorId, createDto.planId);
    
    if (!canJoin.canJoin) {
      throw new Error(canJoin.reason);
    }

    const subscriptionVendor = this.subscriptionVendorRepository.create({
      ...createDto,
      joinedDate: createDto.joinedDate || new Date(),
      isActive: createDto.isActive ?? true,
    });

    const saved = await this.subscriptionVendorRepository.save(subscriptionVendor);
    return this.mapToResponseDto(saved);
  }

  async findAll(): Promise<SubscriptionVendorResponseDto[]> {
    const subscriptionVendors = await this.subscriptionVendorRepository.find({
      relations: ['plan', 'vendor'],
    });
    return subscriptionVendors.map(sv => this.mapToResponseDto(sv));
  }

  async findOne(id: string): Promise<SubscriptionVendorResponseDto> {
    const subscriptionVendor = await this.subscriptionVendorRepository.findOne({
      where: { id },
      relations: ['plan', 'vendor'],
    });

    if (!subscriptionVendor) {
      throw new NotFoundException(`Subscription vendor with ID ${id} not found`);
    }

    return this.mapToResponseDto(subscriptionVendor);
  }

  async findByPlanId(planId: string): Promise<SubscriptionVendorResponseDto[]> {
    const subscriptionVendors = await this.subscriptionVendorRepository.find({
      where: { planId },
      relations: ['plan', 'vendor'],
    });
    return subscriptionVendors.map(sv => this.mapToResponseDto(sv));
  }

  async findByVendorId(vendorId: string): Promise<SubscriptionVendorResponseDto[]> {
    const subscriptionVendors = await this.subscriptionVendorRepository.find({
      where: { vendorId },
      relations: ['plan', 'vendor'],
    });
    return subscriptionVendors.map(sv => this.mapToResponseDto(sv));
  }

  async getVendorSubscriptionPlansCount(vendorId: string): Promise<{ count: number; plans: any[] }> {
    const existingPlans = await this.subscriptionVendorRepository
      .createQueryBuilder('sv')
      .leftJoin('sv.plan', 'p')
      .where('sv.vendorId = :vendorId', { vendorId })
      .andWhere('sv.isActive = :isActive', { isActive: true })
      .andWhere('p.isActive = :planActive', { planActive: true })
      .select([
        'DISTINCT p.id as planId',
        'p.name as planName',
        'p.description as planDescription'
      ])
      .getRawMany();

    return {
      count: existingPlans.length,
      plans: existingPlans
    };
  }

  async canVendorJoinPlan(vendorId: string, planId: string): Promise<{ canJoin: boolean; reason?: string }> {
    // Kiểm tra số lượng plan hiện tại
    const { count } = await this.getVendorSubscriptionPlansCount(vendorId);
    
    if (count >= 2) {
      return {
        canJoin: false,
        reason: `Vendor đã tham gia tối đa 2 subscription plan. Hiện tại đang tham gia ${count} plan.`
      };
    }

    // Kiểm tra xem đã tham gia plan này chưa
    const existingPlan = await this.subscriptionVendorRepository
      .createQueryBuilder('sv')
      .leftJoin('sv.plan', 'p')
      .where('sv.vendorId = :vendorId', { vendorId })
      .andWhere('p.id = :planId', { planId })
      .andWhere('sv.isActive = :isActive', { isActive: true })
      .getOne();

    if (existingPlan) {
      return {
        canJoin: false,
        reason: 'Vendor đã tham gia subscription plan này rồi.'
      };
    }

    return { canJoin: true };
  }

  async update(id: string, updateDto: UpdateSubscriptionVendorDto): Promise<SubscriptionVendorResponseDto> {
    const subscriptionVendor = await this.subscriptionVendorRepository.findOne({
      where: { id },
      relations: ['plan', 'vendor'],
    });

    if (!subscriptionVendor) {
      throw new NotFoundException(`Subscription vendor with ID ${id} not found`);
    }

    Object.assign(subscriptionVendor, updateDto);
    const saved = await this.subscriptionVendorRepository.save(subscriptionVendor);
    return this.mapToResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    const subscriptionVendor = await this.subscriptionVendorRepository.findOne({
      where: { id },
    });

    if (!subscriptionVendor) {
      throw new NotFoundException(`Subscription vendor with ID ${id} not found`);
    }

    await this.subscriptionVendorRepository.remove(subscriptionVendor);
  }

  async endVendorParticipation(id: string, endedDate: Date): Promise<SubscriptionVendorResponseDto> {
    const subscriptionVendor = await this.subscriptionVendorRepository.findOne({
      where: { id },
      relations: ['plan', 'vendor'],
    });

    if (!subscriptionVendor) {
      throw new NotFoundException(`Subscription vendor with ID ${id} not found`);
    }

    subscriptionVendor.endedDate = endedDate;
    subscriptionVendor.isActive = false;

    const saved = await this.subscriptionVendorRepository.save(subscriptionVendor);
    return this.mapToResponseDto(saved);
  }

  /**
   * Lấy lịch sử subscription của vendor, group theo từng lần tham gia plan, có phân trang và sắp xếp
   */
  async getGroupedSubscriptionHistoryByVendorIdWithPagination(vendorId: string, historyDto: HistoryDto) {
    let records = await this.subscriptionVendorRepository.find({
      where: { vendorId },
      relations: ['plan'],
    });
    // Sắp xếp nếu có
    if (historyDto.sortBy && ['createdAt', 'updatedAt'].includes(historyDto.sortBy)) {
      const dir = historyDto.sortDirection === 'asc' ? 1 : -1;
      records = records.sort((a, b) => {
        const aVal = a[historyDto.sortBy] instanceof Date ? a[historyDto.sortBy].getTime() : a[historyDto.sortBy];
        const bVal = b[historyDto.sortBy] instanceof Date ? b[historyDto.sortBy].getTime() : b[historyDto.sortBy];
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    } else {
      records = records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // Lấy lịch sử cho từng subscriptionVendor nếu có, lọc theo action nếu có
    const mapped = [];
    for (const sv of records) {
      let history = [];
      if (sv.id) {
        history = await this.subscriptionHistoryService.findBySubscriptionId(sv.id);
        if (historyDto.action) {
          history = history.filter(h => h.action === historyDto.action);
        }
      }
      mapped.push({
        subscriptionVendor: {
          id: sv.id,
          joinedDate: sv.joinedDate,
          endedDate: sv.endedDate,
          isActive: sv.isActive,
          createdAt: sv.createdAt,
          updatedAt: sv.updatedAt,
        },
        plan: sv.plan,
        history,
      });
    }
    // Phân trang
    const pageNum = Math.max(1, historyDto.current || 1);
    const pageSizeNum = Math.max(1, historyDto.pageSize || 10);
    const totalRecords = mapped.length;
    const totalPage = Math.ceil(totalRecords / pageSizeNum);
    const paged = mapped.slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum);
    return {
      history: paged,
      totalRecords,
      pagination: {
        current: pageNum,
        pageSize: pageSizeNum,
        totalPage,
        totalItem: totalRecords,
      },
    };
  }

  private mapToResponseDto(subscriptionVendor: SubscriptionVendor): SubscriptionVendorResponseDto {
    return {
      id: subscriptionVendor.id,
      planId: subscriptionVendor.planId,
      vendorId: subscriptionVendor.vendorId,
      joinedDate: subscriptionVendor.joinedDate,
      endedDate: subscriptionVendor.endedDate,
      isActive: subscriptionVendor.isActive,
      createdAt: subscriptionVendor.createdAt,
      updatedAt: subscriptionVendor.updatedAt,
    };
  }
} 