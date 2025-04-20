import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { FindSubscriptionPlanDto } from './dto/find-subscription-plan.dto';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
  ) { }

  //#region create
  async create(createSubscriptionPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const subscriptionPlan = this.subscriptionPlanRepository.create(createSubscriptionPlanDto);
    return this.subscriptionPlanRepository.save(subscriptionPlan);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindSubscriptionPlanDto): Promise<{
    data: SubscriptionPlan[];
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
    const queryBuilder = this.subscriptionPlanRepository.createQueryBuilder('subscriptionPlan');

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(subscriptionPlan.name) ILIKE unaccent(:term) OR unaccent(subscriptionPlan.description) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['id', 'name'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'id';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`subscriptionPlan.${sortField}`, sortDirection);
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
  async findOne(id: string): Promise<SubscriptionPlan> {
    const subscriptionPlan = await this.subscriptionPlanRepository.findOne({ where: { id } });
    if (!subscriptionPlan) {
      throw new NotFoundException(`Gói đăng ký với ID ${id} không tồn tại`);
    }
    return subscriptionPlan;
  }
  //#endregion findOne
}