import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { payosProvider } from './payos.provider';
import { PayOSService } from './payos.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [payosProvider,PayOSService],
  exports: [payosProvider.provide,PayOSService],
})
export class PayosModule {}
