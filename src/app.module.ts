import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { UserModule } from './modules/users/user.module';
import { TransformInterceptor } from './core/transform.interceptor';
import { JwtAuthGuard } from './modules/auth/passport/jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from './modules/roles/role.module';
import { User } from './modules/users/entities/user.entity';
import { Role } from './modules/roles/entities/role.entity';
import { GoogleAuthModule } from './3rdService/google/goole-auth.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailerModule,  } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import * as Handlebars from 'handlebars';
import * as moment from 'moment';

Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
  return moment(date).format(format);
});

Handlebars.registerHelper('formatPrice', (price: number) => {
  return price.toLocaleString('vi-VN');
});

Handlebars.registerHelper('split', function (value: string) {
  if (typeof value === 'string') {
    return value.split('');
  }
  return [];
});


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép dùng process.env ở mọi nơi
    }),
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
          dir: './src/3rdService/mail/templates',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    RoleModule,
    GoogleAuthModule,
    AuthModule,
 
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // RabbitmqConsumerService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule { }
