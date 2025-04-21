import { Module } from '@nestjs/common';

import { UserModule } from '../../modules/users/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleModule } from 'src/modules/roles/role.module';
import { FacebookStrategy } from './passport/facebook.strategy';
import { AuthModule } from 'src/modules/auth/auth.module';
import { FacebookAuthController } from './facebook.controller';
import { FacebookAuthService } from './facebook.service';

@Module({
    imports: [
        UserModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') },
            }),
            inject: [ConfigService],
        }),
        ConfigModule,
        AuthModule,
    ],
    controllers: [FacebookAuthController],
    providers: [FacebookAuthService, FacebookStrategy],
    exports: [FacebookAuthService],
})
export class FacebookAuthModule { }