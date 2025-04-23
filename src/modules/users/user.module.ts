
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { RoleModule } from '../roles/role.module';
import { UploadModule } from 'src/3rdService/upload/upload.module';
import { MailModule } from 'src/3rdService/mail/mail.module';
import { BullQueueModule } from 'src/3rdService/bull/bull-queue.module';
import { UserProcessor } from './bull/user.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RoleModule,
    UploadModule,
    MailModule,
    BullQueueModule.registerQueue('user-deletion'),
    BullQueueModule.forRoot(),
  ],
  providers: [UserService, UserProcessor],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule { }