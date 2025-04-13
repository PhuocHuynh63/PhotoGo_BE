import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';

import { Role } from './entities/role.entity';
import { RoleService } from './role.service';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('roles')
@ApiBearerAuth('access-token')
export class RoleController {
  constructor(private readonly roleService: RoleService) { }


  @Public()
  @Get()
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get('/default')
  async findOneName(): Promise<Role> {
    return this.roleService.getDefaultRole();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @Post()
  async create(@Body() roleData: Partial<Role>): Promise<Role> {
    return this.roleService.create(roleData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() roleData: Partial<Role>): Promise<Role> {
    return this.roleService.update(id, roleData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.roleService.delete(id);
  }
}