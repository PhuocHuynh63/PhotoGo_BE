import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { Role } from './entities/role.entity';
import { RoleService } from './role.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth('access-token')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách quyền' })
  @ApiResponse({ status: 200, type: [Role] })
  @ResponseMessage('Lấy danh sách quyền thành công')
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get('/default')
  @ApiOperation({ summary: 'Lấy quyền mặc định' })
  @ApiResponse({ status: 200, type: Role })
  @ResponseMessage('Lấy quyền mặc định thành công')
  async findOneName(): Promise<Role> {
    return this.roleService.getDefaultRole();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy quyền theo ID' })
  @ApiResponse({ status: 200, type: Role })
  @ResponseMessage('Lấy thông tin quyền thành công')
  async findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo quyền mới' })
  @ApiResponse({ status: 201, type: Role })
  @ResponseMessage('Tạo quyền thành công')
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.roleService.create(createRoleDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật quyền' })
  @ApiResponse({ status: 200, type: Role })
  @ResponseMessage('Cập nhật quyền thành công')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<Role> {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa quyền' })
  @ApiResponse({ status: 200 })
  @ResponseMessage('Xóa quyền thành công')
  async remove(@Param('id') id: string): Promise<void> {
    return this.roleService.remove(id);
  }
}