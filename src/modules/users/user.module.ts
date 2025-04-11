
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { RoleModule } from '../roles/role.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RoleModule, 
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}