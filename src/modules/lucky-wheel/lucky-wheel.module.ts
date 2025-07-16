import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuckyWheelController } from './lucky-wheel.controller';
import { LuckyWheelService } from './lucky-wheel.service';
import { LuckyWheel } from './entities/lucky-wheel.entity';
import { LuckyWheelPrize } from './entities/lucky-wheel-prize.entity';
import { LuckyWheelSpin } from './entities/lucky-wheel-spin.entity';
import { PointModule } from '../points/point.module';
import { VoucherModule } from '../vouchers/voucher.module';
import { CampaignModule } from '../campaign/campaign.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            LuckyWheel,
            LuckyWheelPrize,
            LuckyWheelSpin,
        ]),
        PointModule,      // For points integration
        VoucherModule,    // For voucher rewards
        CampaignModule,   // For campaign integration
        AuthModule,       // For authentication guards
    ],
    controllers: [LuckyWheelController],
    providers: [LuckyWheelService],
    exports: [LuckyWheelService],
})
export class LuckyWheelModule { } 