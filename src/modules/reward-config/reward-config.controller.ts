import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RewardConfigService } from './reward-config.service';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from '../../decorator/role.decorator';
import { Role } from '../roles/entities/role.entity';
import { Public } from 'src/decorator/custom';

@Controller('reward-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RewardConfigController {
  constructor(private readonly rewardConfigService: RewardConfigService) {}

  @Post()
  @Roles({ id: 'R001', name: 'admin' } as Role)
  async create(
    @Body('streakDay') streakDay: number,
    @Body('points') points: number,
    @Body('description') description?: string,
  ) {
    return await this.rewardConfigService.create(streakDay, points, description);
  }

  @Get()
  @Public()
  async findAll() {
    return await this.rewardConfigService.findAll();
  }

  @Get(':streakDay')
  @Public()
  async findByStreakDay(@Param('streakDay') streakDay: number) {
    return await this.rewardConfigService.findByStreakDay(streakDay);
  }

  @Put(':configId')
  @Roles({ id: 'R005', name: 'admin' } as Role)
  async update(
    @Param('configId') configId: number,
    @Body('points') points: number,
    @Body('description') description?: string,
  ) {
    return await this.rewardConfigService.update(configId, points, description);
  }

  @Delete(':configId')
  @Roles({ id: 'R005', name: 'admin' } as Role)
  async delete(@Param('configId') configId: number) {
    return await this.rewardConfigService.delete(configId);
  }
} 