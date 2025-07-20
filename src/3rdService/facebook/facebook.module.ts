import { Module } from '@nestjs/common';
import { FacebookAuthService } from './facebook.service';
import { FacebookStrategy } from './passport/facebook.strategy';
import { FacebookAuthController } from './facebook.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/modules/users/user.module';

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
        UserModule,
    ],
    providers: [FacebookAuthService, FacebookStrategy],
    controllers: [FacebookAuthController],
})
export class FacebookAuthModule { }