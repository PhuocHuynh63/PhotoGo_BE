import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUser } from './entities/voucher-user.entity';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { CampaignVoucher } from '../campaign/entities/campaign-voucher.entity';
import { User } from '../users/entities/user.entity';
import { UserCampaign } from '../campaign/entities/user-campaign.entity';
import { Point } from '../points/entities/point.entity';
import { PointTransaction } from '../points/entities/point-transaction.entity';
import { PointModule } from '../points/point.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherUser, CampaignVoucher, User, UserCampaign, Point, PointTransaction]),
    PointModule,
    forwardRef(() => NotificationModule)
  ],
  providers: [VoucherService],
  controllers: [VoucherController],
  exports: [VoucherService],
})
export class VoucherModule { }