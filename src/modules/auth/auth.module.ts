import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/modules/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './passport/local.strategy';
import { JwtStrategy } from './passport/jwt.strategy';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { RolesGuard } from './passport/roles.guard';
// import { GoogleAuthService } from './google-auth.service';
// import { GoogleAuthController } from './google-auth.controller';
// import { User, UserSchema } from '@modules/user/entities/user.schema';
// import { GoogleStrategy } from './passport/google.strategy';
// import { UploadService } from 'src/upload/upload.service';
// import { CloudinaryModule } from 'src/upload/cloudinary/cloudinary.module';
// import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    UserModule,
    // CloudinaryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') },
      }),
      inject: [ConfigService],
    }),
    PassportModule,
    // MailModule,
  ],
  // controllers: [AuthController, GoogleAuthController],
  controllers: [AuthController],
  // providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard, RolesGuard, GoogleAuthService, GoogleStrategy],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule { }