import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUser } from './entities/voucher-user.entity';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { CampaignVoucher } from '../campaign/entities/campaign-voucher.entity';
import { User } from '../users/entities/user.entity';
import { UserCampaign } from '../campaign/entities/user-campaign.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher, VoucherUser, CampaignVoucher, User, UserCampaign])],
  providers: [VoucherService],
  controllers: [VoucherController],
  exports: [VoucherService],
})
export class VoucherModule {}