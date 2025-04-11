import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RoleService } from '../roles/role.service';
import { UpdateAuthDto } from '../auth/dto/update-auth.dto';
import { hashPasswordHelper } from 'src/utils/utils';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>, // Inject UserRepository
    private readonly roleService: RoleService, // Inject RoleService
  ) { }

  //#region create 
  async create(createAuthDto: CreateAuthDto): Promise<User> {
    const { passwordHash, ...userData } = createAuthDto;

    // Enforce the strong password regex for local registration
    let hashedPassword = '';
    if (createAuthDto.auth === 'local') {
      hashedPassword = await hashPasswordHelper(passwordHash);
    }

    const role = await this.roleService.getDefaultRole(); // Lấy role mặc định từ RoleService

    const user = this.userRepository.create({
      passwordHash: hashedPassword,
      ...userData,
      role, // Gán role vào user
    });

    return this.userRepository.save(user);
  }
  //#endregion create

  //#region update
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }
  //#endregion update

  //#region remove
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
  //#endregion remove

  //#region activateAccount
  async activeAccount(body: { email: string }): Promise<any> {
    const { email } = body; // Ensure email is declared
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.status === 'active') {
      throw new BadRequestException('User is already active');
    }
    user.status = 'active';
    await this.userRepository.save(user);
    return { message: 'Account activated' };
  }
  //#endregion

  //#region resetPassword
  async resetPassword(data: UpdateAuthDto): Promise<any> {
    const { email, passwordHash } = data; // Ensure email is declared
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await hashPasswordHelper(passwordHash);
    user.passwordHash = hashedPassword;
    await this.userRepository.save(user);
    return { message: 'Password reset successful' };
  }
  //#endregion

  //#region findAll
  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['role'] });
  }
  //#endregion findAll

  //#region findOne
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
  //#endregion findOne

  //#region findOneByEmail
  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email }, relations: ['role'] });
  }
  //#endregion findOneByEmail


}