import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  async findOne(id: string): Promise<Role> {
    return this.roleRepository.findOne({ where: { id } });
  }

  async getDefaultRole(): Promise<Role | undefined> {
    return this.roleRepository.findOne({ where: { id: 'R001' } });
  }
  
  async create(roleData: Partial<Role>): Promise<Role> {
    const role = this.roleRepository.create(roleData);
    return this.roleRepository.save(role);
  }

  async update(id: string, roleData: Partial<Role>): Promise<Role> {
    await this.roleRepository.update(id, roleData);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.roleRepository.delete(id);
  }
}