import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { UserModule } from '../../modules/users/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleModule } from 'src/modules/roles/role.module';
import { GoogleStrategy } from './passport/google.strategy';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') }, // Tùy chọn thời gian hết hạn token
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    AuthModule,
  ],
  controllers: [GoogleAuthController],
  providers: [GoogleAuthService, GoogleStrategy], 
  exports: [GoogleAuthService],
})
export class GoogleAuthModule {}