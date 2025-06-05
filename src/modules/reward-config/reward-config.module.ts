import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardConfig } from './entities/reward-config.entity';
import { RewardConfigService } from './reward-config.service';
import { RewardConfigController } from './reward-config.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RewardConfig]),
    AuthModule
  ],
  controllers: [RewardConfigController],
  providers: [RewardConfigService],
  exports: [RewardConfigService],
})
export class RewardConfigModule {} 