import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignVoucher } from './entities/campaign-voucher.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { LoyaltyCampaign } from './entities/loyalty-campaign.entity';
import { User } from '../users/entities/user.entity';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { UserModule } from '../users/user.module';
import { VoucherModule } from '../vouchers/voucher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      CampaignVoucher,
      UserCampaign,
      LoyaltyCampaign,
      User,
      Voucher,
      VoucherUser,
    ]),
    VoucherModule,
    UserModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {} 