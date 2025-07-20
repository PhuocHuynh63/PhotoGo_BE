import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { FindSubscriptionPlanDto } from './dto/subscription-plan.dto';
import { PlanType, BillingCycle } from 'src/constants/subscription.enum';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const subscriptionPlan = this.subscriptionPlanRepository.create({
      ...createSubscriptionPlanDto,
      isActive: createSubscriptionPlanDto.isActive ?? true,
    });
    return await this.subscriptionPlanRepository.save(subscriptionPlan);
  }

  async findAll(findSubscriptionPlanDto: FindSubscriptionPlanDto): Promise<{
    data: SubscriptionPlan[],
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    }
  }> {
    const queryBuilder = this.subscriptionPlanRepository.createQueryBuilder('subscriptionPlan');

    if (findSubscriptionPlanDto.name) {
      queryBuilder.andWhere('subscriptionPlan.name ILIKE :name', { name: `%${findSubscriptionPlanDto.name}%` });
    }

    if (findSubscriptionPlanDto.isActive !== undefined) {
      console.log('DEBUG isActive:', findSubscriptionPlanDto.isActive, typeof findSubscriptionPlanDto.isActive);
      queryBuilder.andWhere('subscriptionPlan.isActive = :isActive', { isActive: findSubscriptionPlanDto.isActive });
    }

    if (findSubscriptionPlanDto.planType) {
      queryBuilder.andWhere('subscriptionPlan.planType = :planType', { planType: findSubscriptionPlanDto.planType });
    }

    // Pagination
    const current = findSubscriptionPlanDto.current || 1;
    const pageSize = findSubscriptionPlanDto.pageSize || 10;
    queryBuilder.skip((current - 1) * pageSize).take(pageSize);

    // Sorting
    const sortBy = findSubscriptionPlanDto.sortBy || 'createdAt';
    const sortDirection = (findSubscriptionPlanDto.sortDirection || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`subscriptionPlan.${sortBy}`, sortDirection);

    // Log the SQL query for data
    // console.log('DEBUG SQL (data):', queryBuilder.getSql());

    // Get total count before pagination
    const countQueryBuilder = queryBuilder.clone();
    // console.log('DEBUG SQL (count):', countQueryBuilder.getSql());
    const totalItem = await countQueryBuilder.getCount();

    // Get paginated data
    const data = await queryBuilder.getMany();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const subscriptionPlan = await this.subscriptionPlanRepository.findOne({
      where: { id },
    });

    if (!subscriptionPlan) {
      throw new NotFoundException('Không tìm thấy subscription plan');
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