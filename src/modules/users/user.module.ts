
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { RoleModule } from '../roles/role.module';
import { UploadModule } from 'src/3rdService/upload/upload.module';
import { MailModule } from 'src/3rdService/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RoleModule, 
    UploadModule,
    MailModule,
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}