import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionVendor } from './entities/subscription-vendor.entity';
import { CreateSubscriptionVendorDto, UpdateSubscriptionVendorDto, SubscriptionVendorResponseDto } from './dto/subscription-vendor.dto';

@Injectable()
export class SubscriptionVendorService {
  constructor(
    @InjectRepository(SubscriptionVendor)
    private subscriptionVendorRepository: Repository<SubscriptionVendor>,
  ) {}

  async create(createDto: CreateSubscriptionVendorDto): Promise<SubscriptionVendorResponseDto> {
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