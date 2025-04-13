import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';

import { Role } from './entities/role.entity';
import { RoleService } from './role.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('roles')
@ApiBearerAuth('access-token')
export class RoleController {
  constructor(private readonly roleService: RoleService) { }


  @Public()
  @Get()
  @ResponseMessage('Lấy danh sách quyền thành công')
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get('/default')
  @ResponseMessage('Lấy quyền mặc định thành công')
  async findOneName(): Promise<Role> {
    return this.roleService.getDefaultRole();
  }

  @Get(':id')
  @ResponseMessage('Lấy thông tin quyền thành công')
  async findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @Post()
  @ResponseMessage('Tạo quyền thành công')
  async create(@Body() roleData: Partial<Role>): Promise<Role> {
    return this.roleService.create(roleData);
  }

  @Put(':id')
  @ResponseMessage('Cập nhật quyền thành công')
  async update(@Param('id') id: string, @Body() roleData: Partial<Role>): Promise<Role> {
    return this.roleService.update(id, roleData);
  }

  @Delete(':id')
  @ResponseMessage('Xóa quyền thành công')
  async delete(@Param('id') id: string): Promise<void> {
    return this.roleService.delete(id);
  }
}