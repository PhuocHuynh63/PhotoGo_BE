import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './passport/local.strategy';
import { JwtStrategy } from './passport/jwt.strategy';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { RolesGuard } from './passport/roles.guard';
import { MailModule } from 'src/3rdService/mail/mail.module';
import { CloudinaryModule } from 'src/3rdService/upload/cloudinary/cloudinary.module';
import { CartModule } from 'src/modules/carts/cart.module';
import { WishlistModule } from 'src/modules/wishlists/wishlist.module';
import { CampaignModule } from 'src/modules/campaign/campaign.module';
import { NotificationModule } from 'src/modules/notifications/notification.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    CloudinaryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in the environment variables');
        }
        return {
          global: true,
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED'),
          },
        };
      },
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }), // Đặt chiến lược mặc định là 'jwt'
    MailModule,
    CartModule,
    WishlistModule,
    forwardRef(() => CampaignModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, PassportModule],
})
export class AuthModule { }