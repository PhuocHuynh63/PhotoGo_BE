import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RoleService } from '../roles/role.service';

import { hashPasswordHelper } from 'src/utils/utils';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';

import * as bcrypt from 'bcrypt';
import { UploadService } from 'src/3rdService/upload/upload.service';
import { ResetPasswordDto } from './dto/rest-password.dto';
import { MailService } from 'src/3rdService/mail/mail.service';


@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>, // Inject UserRepository
    private readonly roleService: RoleService, // Inject RoleService
    private readonly uploadService: UploadService, // Inject UploadService
    private readonly MailService: MailService, // Inject MailService
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
    const user = await this.findOne(id); // Tìm user theo ID
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Nếu có trường passwordHash, kiểm tra mật khẩu cũ trước khi cập nhật
    if (updateUserDto.passwordHash && updateUserDto.oldPasswordHash) {
      const isMatch = await bcrypt.compare(updateUserDto.oldPasswordHash, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Old password is incorrect');
      }
      // Mã hóa mật khẩu mới
      updateUserDto.passwordHash = await hashPasswordHelper(updateUserDto.passwordHash);
    }

    // Cập nhật thông tin user
    Object.assign(user, updateUserDto);

    // Lưu thay đổi vào cơ sở dữ liệu
    return this.userRepository.save(user);
  }
  //#endregion update

  //#region uploadImage
  async uploadImage(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const imageUrl = await this.uploadService.uploadImage(file, 'avatar', user.avatarUrl);
    user.avatarUrl = imageUrl;
    return this.userRepository.save(user);
  }
  //#endregion uploadImage

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
  async resetPassword(user: User, data: ResetPasswordDto): Promise<any> {
    const isMatch = await bcrypt.compare(data.passwordHash, user.passwordHash);
    if (isMatch) {
      throw new BadRequestException('New password cannot be the same as the old password');
    }
    user.oldPasswordHash = user.passwordHash;
    user.passwordHash = await hashPasswordHelper(data.passwordHash);
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