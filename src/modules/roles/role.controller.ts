import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { Role } from './entities/role.entity';
import { RoleService } from './role.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { isUUID } from 'class-validator';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth('access-token')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách quyền' })
  @ApiResponse({ status: 200, type: [Role], description: 'Danh sách quyền' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Lấy danh sách quyền thành công')
  async findAll(): Promise<Role[]> {
    try {
      return await this.roleService.findAll();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy danh sách quyền', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/default')
  @ApiOperation({ summary: 'Lấy quyền mặc định' })
  @ApiResponse({ status: 200, type: Role, description: 'Thông tin quyền mặc định' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy quyền mặc định' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Lấy quyền mặc định thành công')
  async findOneName(): Promise<Role> {
    try {
      const defaultRole = await this.roleService.getDefaultRole();
      if (!defaultRole) {
        throw new HttpException('Không tìm thấy quyền mặc định', HttpStatus.NOT_FOUND);
      }
      return defaultRole;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy quyền mặc định', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy quyền theo ID' })
  @ApiResponse({ status: 200, type: Role, description: 'Thông tin quyền' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy quyền' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Lấy thông tin quyền thành công')
  async findOne(@Param('id') id: string): Promise<Role> {
    if (!id) {
      throw new HttpException('ID quyền không được để trống', HttpStatus.BAD_REQUEST);
    }
    if (!isUUID(id)) {
      throw new HttpException('Định dạng ID quyền không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.roleService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi lấy thông tin quyền', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Tạo quyền mới' })
  @ApiResponse({ status: 201, type: Role, description: 'Quyền đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Quyền đã tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Tạo quyền thành công')
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    if (!createRoleDto.name) {
      throw new HttpException('Tên quyền không được để trống', HttpStatus.BAD_REQUEST);
    }
    if (!createRoleDto.id) {
      throw new HttpException('ID quyền không được để trống', HttpStatus.BAD_REQUEST);
    }
    if (!isUUID(createRoleDto.id)) {
      throw new HttpException('Định dạng ID quyền không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.roleService.create(createRoleDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi tạo quyền', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật quyền' })
  @ApiResponse({ status: 200, type: Role, description: 'Quyền đã được cập nhật' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy quyền' })
  @ApiResponse({ status: 409, description: 'Tên quyền đã tồn tại' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Cập nhật quyền thành công')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<Role> {
    if (!id) {
      throw new HttpException('ID quyền không được để trống', HttpStatus.BAD_REQUEST);
    }
    if (!isUUID(id)) {
      throw new HttpException('Định dạng ID quyền không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    if (updateRoleDto.name && updateRoleDto.name.trim() === '') {
      throw new HttpException('Tên quyền không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.roleService.update(id, updateRoleDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi cập nhật quyền', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa quyền' })
  @ApiResponse({ status: 200, description: 'Quyền đã được xóa' })
  @ApiResponse({ status: 400, description: 'ID không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy quyền' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  @ResponseMessage('Xóa quyền thành công')
  async remove(@Param('id') id: string): Promise<void> {
    if (!id) {
      throw new HttpException('ID quyền không được để trống', HttpStatus.BAD_REQUEST);
    }
    if (!isUUID(id)) {
      throw new HttpException('Định dạng ID quyền không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    try {
      await this.roleService.remove(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Lỗi khi xóa quyền', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}