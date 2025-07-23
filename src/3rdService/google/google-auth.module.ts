import { forwardRef, Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleStrategy } from './passport/google.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/modules/users/user.module';
import { SubscriptionModule } from 'src/modules/subscription/subscription.module';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1h' },
            }),
            inject: [ConfigService],
        }),
        forwardRef(() => UserModule),
        forwardRef(() => SubscriptionModule),
    ],
    providers: [GoogleAuthService, GoogleStrategy],
    controllers: [GoogleAuthController],
})
export class GoogleAuthModule { } 