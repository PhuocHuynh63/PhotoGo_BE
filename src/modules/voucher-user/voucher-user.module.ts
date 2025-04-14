import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherUser } from './entities/voucher-user.entity';
import { VoucherUserService } from './voucher-user.service';
import { VoucherUserController } from './voucher-user.controller';
import { Voucher } from '../vouchers/entities/voucher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherUser, Voucher])],
  providers: [VoucherUserService],
  controllers: [VoucherUserController],
  exports: [VoucherUserService],
})
export class VoucherUserModule {}