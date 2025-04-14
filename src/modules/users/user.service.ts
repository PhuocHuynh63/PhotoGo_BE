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
import { MailService } from 'src/3rdService/mail/mail.service';
import { FindUserDto } from './dto/admin/find-user.dto';
import { UpdateUserForAdminDto } from './dto/admin/update-user-admin.dto';


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

  //#region update
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id); // Tìm user theo ID
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }

    // Nếu có trường passwordHash, kiểm tra mật khẩu cũ trước khi cập nhật
    if (updateUserDto.passwordHash && updateUserDto.oldPasswordHash && updateUserDto.confirmPassword) {
      const isMatch = await bcrypt.compare(updateUserDto.oldPasswordHash, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Mật khẩu cũ không đúng');
      }
      if (updateUserDto.passwordHash !== updateUserDto.confirmPassword) {
        throw new BadRequestException('Mật khẩu xác nhận không khớp');
      }
      updateUserDto.oldPasswordHash = user.passwordHash; // Lưu mật khẩu cũ để so sánh
      // Mã hóa mật khẩu mới
      updateUserDto.passwordHash = await hashPasswordHelper(updateUserDto.passwordHash);
    }

    // Cập nhật thông tin user
    Object.assign(user, updateUserDto);

    // Lưu thay đổi vào cơ sở dữ liệu
    return this.userRepository.save(user);
  }
  //#endregion update

  //#region updateUserByAdmin
  async updateUserByAdmin(id: string, update: UpdateUserForAdminDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (update.password) {
      const passwordHash = await hashPasswordHelper(update.password);
      user.oldPasswordHash = user.passwordHash; // Lưu mật khẩu cũ để so sánh
      user.passwordHash = passwordHash; // Cập nhật mật khẩu mới
    }

    // Cập nhật thông tin từ DTO
    Object.assign(user, update);

    // Nếu có roleId, tìm role và gán vào user
    if (update.roleId) {
      const role = await this.roleService.findOne(update.roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${update.roleId} not found`);
      }
      user.role = role;
    }

    return this.userRepository.save(user);
  }
  //#endregion updateUserByAdmin

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
  async resetPassword(user: User, passwordHash: string): Promise<any> {
    const isMatch = await bcrypt.compare(passwordHash, user.passwordHash);
    if (isMatch) {
      throw new BadRequestException('New password cannot be the same as the old password');
    }
    user.oldPasswordHash = user.passwordHash;
    user.passwordHash = await hashPasswordHelper(passwordHash);
    await this.userRepository.save(user);
    return { message: 'Password reset successful' };
  }
  //#endregion

  //#region findAll
  async findAll(query: FindUserDto): Promise<{
    data: User[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Filter
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Thêm join để lấy thông tin role
    queryBuilder.leftJoinAndSelect('user.role', 'role');

    if (query.term) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :term OR user.email ILIKE :term OR user.phoneNumber ILIKE :term)',
        { term: `%${query.term}%` },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.rank) {
      queryBuilder.andWhere('user.rank = :rank', { rank: query.rank });
    }

    if (query.auth) {
      queryBuilder.andWhere('user.auth = :auth', { auth: query.auth });
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['createdAt', 'updatedAt', 'fullName', 'email', 'phoneNumber', 'status', 'rank'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`user.${sortField}`, sortDirection);
    //#endregion

    //#region Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
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

  //region Count user by rank
  async countUserByRank(rank: string): Promise<number> {
    const count = await this.userRepository.count({ where: { rank } });
    return count;
  }
  //#endregion Count user by rank

//#region Get all ranks with count
async getAllRank(): Promise<{ rank: string; count: number }[]> {
  const rankCounts = await this.userRepository
    .createQueryBuilder('user')
    .select('user.rank', 'rank') // Chọn cột rank
    .addSelect('COUNT(user.id)', 'count') // Đếm số lượng user theo rank
    .groupBy('user.rank') // Nhóm theo rank
    .getRawMany();

  // Định dạng kết quả trả về
  return rankCounts.map((item) => ({
    rank: item.rank,
    count: Number(item.count), // Chuyển count từ string sang number
  }));
}
//#endregion Get all ranks with count

//#region exportUsers
async exportUsers(query: FindUserDto): Promise<User[]> {
  const queryBuilder = this.userRepository.createQueryBuilder('user');

  // Thêm join để lấy thông tin role
  queryBuilder.leftJoinAndSelect('user.role', 'role');

  // Áp dụng bộ lọc tương tự như findAll
  if (query.term) {
    queryBuilder.andWhere(
      '(user.fullName ILIKE :term OR user.email ILIKE :term OR user.phoneNumber ILIKE :term)',
      { term: `%${query.term}%` },
    );
  }

  if (query.status) {
    queryBuilder.andWhere('user.status = :status', { status: query.status });
  }

  if (query.rank) {
    queryBuilder.andWhere('user.rank = :rank', { rank: query.rank });
  }

  if (query.auth) {
    queryBuilder.andWhere('user.auth = :auth', { auth: query.auth });
  }

  // Sắp xếp
  const allowedSortFields = ['createdAt', 'updatedAt', 'fullName', 'email', 'phoneNumber', 'status', 'rank'];
  const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

  queryBuilder.orderBy(`user.${sortField}`, sortDirection);

  // Lấy tất cả dữ liệu (không phân trang)
  const users = await queryBuilder.getMany();
  return users;
}
//#endregion exportUsers
}