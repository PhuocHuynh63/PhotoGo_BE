import { Controller, Get, Post, Put, Delete, Param, Body, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { UserService } from './user.service';

import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { FindUserDto } from './dto/admin/find-user.dto';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateUserForAdminDto } from './dto/admin/update-user-admin.dto';
@Controller('users')
@ApiBearerAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) { }


  @Public()
  @Get()
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async findAll(@Query() query: FindUserDto): Promise<{
    data: User[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.userService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Lấy thông tin người dùng thành công')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Put('/img/:id/')
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Cập nhật ảnh người dùng thành công')
  async updateImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File): Promise<User> {
    return this.userService.uploadImage(id, file);
  }

  @Put(':id')
  @ResponseMessage('Chỉnh sửa người dùng thành công')
  async update(@Param('id') id: string, @Body() update: UpdateUserDto): Promise<User> {
    return this.userService.update(id, update);
  }

  @Put('/admin/:id')
  @ResponseMessage('Chỉnh sửa người dùng thành công')
  async updateUserByAdmin(@Param('id') id: string, @Body() update: UpdateUserForAdminDto): Promise<User> {
    return this.userService.updateUserByAdmin(id, update);
  }

  @Delete(':id')
  @ResponseMessage('Xóa người dùng thành công')
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }

  @Public()
  @Get('/admin/count/:rank')
  @ResponseMessage('Đếm người dùng theo rank thành công')
  async countUserByRank(@Param('rank') rank: string): Promise<number> {
    return this.userService.countUserByRank(rank);
  }

  @Public()
  @Get('/admin/ranks')
  @ResponseMessage('Lấy danh sách rank người dùng thành công')
  async getAllRanks(): Promise<{ rank: string; count: number }[]> {
    return this.userService.getAllRank();
  }
}