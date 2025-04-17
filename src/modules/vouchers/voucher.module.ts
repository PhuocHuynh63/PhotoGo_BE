import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUser } from './entities/voucher-user.entity';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher, VoucherUser])],
  providers: [VoucherService],
  controllers: [VoucherController],
  exports: [VoucherService],
})
export class VoucherModule {}