
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { RoleModule } from '../roles/role.module';
import { UploadModule } from 'src/3rdService/upload/upload.module';
import { MailModule } from 'src/3rdService/mail/mail.module';
import { BullQueueModule } from 'src/3rdService/bull/bull-queue.module';
import { UserProcessor } from './bull/user.processor';
import { CartModule } from 'src/modules/carts/cart.module';
import { WishlistModule } from 'src/modules/wishlists/wishlist.module';
import { CampaignModule } from 'src/modules/campaign/campaign.module';
import { UserCampaign } from '../campaign/entities/user-campaign.entity';
import { CampaignVoucher } from '../campaign/entities/campaign-voucher.entity';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import { RolesGuard } from '../auth/passport/roles.guard';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { Point } from '../points/entities/point.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserCampaign, CampaignVoucher, VoucherUser, Voucher, Campaign, Point]),
    RoleModule,
    UploadModule,
    MailModule,
    CartModule,
    WishlistModule,
    CampaignModule,
    BullQueueModule.registerQueue('user-deletion'),
    BullQueueModule.forRoot(),
  ],
  providers: [UserService, UserProcessor, RolesGuard, JwtAuthGuard],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule { }