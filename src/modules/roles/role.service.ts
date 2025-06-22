import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) { }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Validate required fields
    if (!createRoleDto.name || createRoleDto.name.trim() === '') {
      throw new BadRequestException('Tên quyền không được để trống');
    }
    if (!createRoleDto.id) {
      throw new BadRequestException('ID quyền không được để trống');
    }

    // Validate UUID format
    if (!isUUID(createRoleDto.id)) {
      throw new BadRequestException('Định dạng ID quyền không hợp lệ');
    }

    // Check for existing role
    const existingRole = await this.roleRepository.findOne({
      where: [
        { id: createRoleDto.id },
        { name: createRoleDto.name }
      ]
    });

    if (existingRole) {
      if (existingRole.id === createRoleDto.id) {
        throw new ConflictException('ID quyền đã tồn tại');
      }
      throw new ConflictException('Tên quyền đã tồn tại');
    }

    try {
      const role = this.roleRepository.create(createRoleDto);
      return await this.roleRepository.save(role);
    } catch (error) {
      throw new BadRequestException('Không thể tạo quyền: ' + error.message);
    }
  }

  async findAll(): Promise<Role[]> {
    try {
      return await this.roleRepository.find({
        order: {
          name: 'ASC'
        }
      });
    } catch (error) {
      throw new BadRequestException('Không thể lấy danh sách quyền: ' + error.message);
    }
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'] // Load users with this role
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy quyền với ID: ${id}`);
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    // Validate UUID format
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID quyền không hợp lệ');
    }

    try {
      const role = await this.findOne(id);

      // Validate name if provided
      if (updateRoleDto.name) {
        if (updateRoleDto.name.trim() === '') {
          throw new BadRequestException('Tên quyền không được để trống');
        }

        // Check for duplicate name
        const existingRole = await this.roleRepository.findOne({
          where: { name: updateRoleDto.name }
        });
        if (existingRole && existingRole.id !== id) {
          throw new ConflictException('Tên quyền đã tồn tại');
        }
      }

      Object.assign(role, updateRoleDto);
      return await this.roleRepository.save(role);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Không thể cập nhật quyền: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    // Validate UUID format
    if (!isUUID(id)) {
      throw new BadRequestException('Định dạng ID quyền không hợp lệ');
    }

    try {
      const role = await this.findOne(id);

      // Check if role is in use
      if (role.users && role.users.length > 0) {
        throw new ConflictException('Không thể xóa quyền đang được sử dụng');
      }

      await this.roleRepository.remove(role);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Không thể xóa quyền: ' + error.message);
    }
  }

  async getDefaultRole(): Promise<Role | undefined> {
    try {
      return await this.roleRepository.findOne({
        where: { id: 'R001' },
        relations: ['users']
      });
    } catch (error) {
      throw new BadRequestException('Không thể lấy quyền mặc định: ' + error.message);
    }
  }
}