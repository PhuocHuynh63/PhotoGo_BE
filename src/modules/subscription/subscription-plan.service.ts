import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { FindSubscriptionPlanDto } from './dto/subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const subscriptionPlan = this.subscriptionPlanRepository.create(createSubscriptionPlanDto);
    return await this.subscriptionPlanRepository.save(subscriptionPlan);
  }

  async findAll(findSubscriptionPlanDto: FindSubscriptionPlanDto): Promise<SubscriptionPlan[]> {
    const queryBuilder = this.subscriptionPlanRepository.createQueryBuilder('subscriptionPlan');

    if (findSubscriptionPlanDto.name) {
      queryBuilder.andWhere('subscriptionPlan.name ILIKE :name', { name: `%${findSubscriptionPlanDto.name}%` });
    }

    if (findSubscriptionPlanDto.isActive !== undefined) {
      queryBuilder.andWhere('subscriptionPlan.isActive = :isActive', { isActive: findSubscriptionPlanDto.isActive });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const subscriptionPlan = await this.subscriptionPlanRepository.findOne({
      where: { id },
    });

    if (!subscriptionPlan) {
      throw new NotFoundException('Không tìm thấy gói đăng ký');
    }

    return subscriptionPlan;
  }

  async update(id: string, updateSubscriptionPlanDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const subscriptionPlan = await this.findOne(id);
    Object.assign(subscriptionPlan, updateSubscriptionPlanDto);
    return await this.subscriptionPlanRepository.save(subscriptionPlan);
  }

  async remove(id: string): Promise<void> {
    const subscriptionPlan = await this.findOne(id);
    await this.subscriptionPlanRepository.remove(subscriptionPlan);
  }
} 