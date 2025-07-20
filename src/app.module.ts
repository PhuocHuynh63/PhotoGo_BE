import { Module } from '@nestjs/common';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { UserModule } from './modules/users/user.module';
import { TransformInterceptor } from './core/transform.interceptor';
import { TimezoneInterceptor } from './core/timezone.interceptor';
import { JwtAuthGuard } from './modules/auth/passport/jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from './modules/roles/role.module';
import { User } from './modules/users/entities/user.entity';
import { Role } from './modules/roles/entities/role.entity';
import { VendorModule } from './modules/vendors/vendor.module';
import { TeamMemberModule } from './modules/team-members/team-member.module';
import { CategoryModule } from './modules/categories/category.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { LocationModule } from './modules/locations/location.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PointModule } from './modules/points/point.module';
import { VoucherModule } from './modules/vouchers/voucher.module';
import { WalletModule } from './modules/wallets/wallet.module';
import { CommentModule } from './modules/comments/comment.module';
import { RefundModule } from './modules/refunds/refund.module';
import { BookingModule } from './modules/bookings/booking.module';
import { CartModule } from './modules/carts/cart.module';
import { ChatModule } from './modules/chats/chat.module';
import { PaymentModule } from './modules/payments/payment.module';
import { PayosModule } from './3rdService/payos/payos.module';
import { GoogleAuthModule } from './3rdService/google/goole-auth.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import * as Handlebars from 'handlebars';
import moment from 'moment';
import { join } from 'path';
import * as fs from 'fs';
import { InvoiceModule } from './modules/invoices/invoice.module';
import { WishlistModule } from './modules/wishlists/wishlist.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SupportTicketsModule } from './modules/support-tickets/support_tickets.module';
import { ReviewModule } from './modules/reviews/reviews.module';
import { ServicePackageModule } from './modules/service-package/service-package.module';
import { FacebookAuthModule } from './3rdService/facebook/facebook.module';
import { BullQueueModule } from './3rdService/bull/bull-queue.module';
import { GeminiModule } from './3rdService/gemini/gemini.module';
import { CheckoutSessionModule } from './modules/checkout-session/checkout-session.module';
import { AttendanceModule } from './modules/attendances/attendance/attendance.module';
import { LocationAvailabilityModule } from './modules/locations/location-availability.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { GoongModule } from './3rdService/goong/goong.module';
import { AttendanceLogModule } from './modules/attendances/attendance-log/attendance-log.module';
import { AlbumModule } from './modules/album/album.module';
import { OverviewModule } from './modules/overview/overview.module';

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
  return moment(date).format(format);
});

Handlebars.registerHelper('formatPrice', (price: number) => {
  return price.toLocaleString('vi-VN');
});

Handlebars.registerHelper('formatCurrency', (value: number) => {
  if (value === undefined || value === null) return '';
  return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
});

Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('eq', (a, b) => a === b);


Handlebars.registerHelper('split', function (value: string) {
  if (typeof value === 'string') {
    return value.split('');
  }
  return [];
});

const isProduction = process.env.NODE_ENV === 'Production';

const templateDir = isProduction
  ? './dist/3rdService/mail/templates'// Absolute path
  : join(process.cwd(), 'src/3rdService/mail/templates');

console.log('Current working directory:', process.cwd());

if (!fs.existsSync(templateDir)) {
  console.error(`Template directory does not exist: ${templateDir}`);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép dùng process.env ở mọi nơi
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Role], // Đăng ký cả User và Role entity
      autoLoadEntities: true,
      synchronize: false, // Bật true chỉ khi đang dev local
      namingStrategy: new SnakeNamingStrategy(),
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: configService.get<number>('MAIL_PORT'),
          secure: true,
          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@example.com>',
        },
        template: {
          dir: templateDir,
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
            helpers: {
              formatDate: (date, format = 'DD/MM/YYYY') => {
                if (typeof format !== 'string') {
                  format = 'DD/MM/YYYY';
                }
                if (!date) return '';
                return moment(date).format(format);
              },
              formatCurrency: (value) => {
                if (value === undefined || value === null) return '';
                return Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
              },
              formatPrice: (price) => {
                if (price === undefined || price === null) return '';
                return Number(price).toLocaleString('vi-VN');
              },
              gt: (a, b) => a > b,
              eq: (a, b) => a === b,
            }
          }
        }
      }),
      inject: [ConfigService],
    }),
    BullQueueModule,
    CheckoutSessionModule,
    GoogleAuthModule,
    FacebookAuthModule,
    ChatModule,
    GeminiModule,
    AuthModule,
    UserModule,
    RoleModule,
    VendorModule,
    ServicePackageModule,
    BookingModule,
    InvoiceModule,
    PaymentModule,
    ReviewModule,
    AttendanceModule,
    AttendanceLogModule,
    CategoryModule,
    LocationModule,
    LocationAvailabilityModule,
    TeamMemberModule,
    SubscriptionModule,
    VoucherModule,
    CampaignModule,
    PointModule,
    PayosModule,
    RefundModule,
    WalletModule,
    CartModule,
    WishlistModule,
    SupportTicketsModule,
    NotificationModule,
    GoongModule,
    AlbumModule,
    OverviewModule

  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimezoneInterceptor,
    },
  ],
})
export class AppModule { }