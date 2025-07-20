import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { CommissionStatus, CommissionType } from 'src/constants/commision.enum';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
  ) {}

  async findAll() {
    return this.commissionRepository.find({
      relations: ['serviceConcept'],
    });
  }

  async findActiveCommissions() {
    return this.commissionRepository.find({
      where: {
        status: CommissionStatus.ACTIVE,
      },
      relations: ['serviceConcept'],
    });
  }

  async getCommissionStatistics(startDate?: Date, endDate?: Date) {
    let query = this.commissionRepository
      .createQueryBuilder('commission')
      .leftJoinAndSelect('commission.serviceConcept', 'serviceConcept')
      .where('commission.status = :status', { status: CommissionStatus.ACTIVE });

    if (startDate && endDate) {
      query = query.andWhere('commission.created_at >= :startDate', { startDate })
        .andWhere('commission.created_at <= :endDate', { endDate });
    }

    return query.getMany();
  }
} 