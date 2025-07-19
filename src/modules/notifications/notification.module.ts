import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationSocketController } from './notification-socket.controller';
import { NotificationSocketGateway } from './notification-socket.gateway';
import { NotificationSocketService } from './notification-socket.service';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuthModule)
  ],
  providers: [
    NotificationService,
    NotificationSocketGateway,
    NotificationSocketService,
    RolesGuard,
    JwtAuthGuard,
    WsJwtGuard
  ],
  controllers: [NotificationController, NotificationSocketController],
  exports: [NotificationService, NotificationSocketService],
})
export class NotificationModule { }