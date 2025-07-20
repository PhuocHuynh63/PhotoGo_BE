import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    forwardRef(() => AuthModule)
  ],
  providers: [NotificationService, RolesGuard, JwtAuthGuard],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule { }