import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardConfig } from './entities/reward-config.entity';

@Injectable()
export class RewardConfigService {
  constructor(
    @InjectRepository(RewardConfig)
    private rewardConfigRepository: Repository<RewardConfig>,
  ) {}

  async create(streakDay: number, points: number, description?: string): Promise<RewardConfig> {
    const config = this.rewardConfigRepository.create({
      streakDay,
      points,
      description,
    });
    return await this.rewardConfigRepository.save(config);
  }

  async findAll(): Promise<RewardConfig[]> {
    return await this.rewardConfigRepository.find({
      order: { streakDay: 'ASC' },
    });
  }

  async findByStreakDay(streakDay: number): Promise<RewardConfig> {
    const config = await this.rewardConfigRepository.findOne({
      where: { streakDay },
    });
    if (!config) {
      throw new NotFoundException('Reward configuration not found');
    }
    return config;
  }

  async update(configId: number, points: number, description?: string): Promise<RewardConfig> {
    const config = await this.rewardConfigRepository.findOne({
      where: { configId },
    });
    if (!config) {
      throw new NotFoundException('Reward configuration not found');
    }
    
    config.points = points;
    if (description) {
      config.description = description;
    }
    
    return await this.rewardConfigRepository.save(config);
  }

  async delete(configId: number): Promise<void> {
    const result = await this.rewardConfigRepository.delete(configId);
    if (result.affected === 0) {
      throw new NotFoundException('Reward configuration not found');
    }
  }
} 