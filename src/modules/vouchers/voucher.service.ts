import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherUser } from './entities/voucher-user.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { FindVoucherDto } from './dto/find-voucher.dto';
import { CreateVoucherUserDto } from './dto/create-voucher.dto';
import { FindVoucherUserDto } from './dto/find-voucher.dto';
import { VoucherStatusEnum, VoucherUserStatusEnum } from 'src/constants/voucher.enum';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherUser)
    private readonly voucherUserRepository: Repository<VoucherUser>,
  ) { }

  //#region Voucher Operations
  async createVoucher(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const voucher = this.voucherRepository.create(createVoucherDto);
    return this.voucherRepository.save(voucher);
  }

  async findAllVouchers(query: FindVoucherDto): Promise<{
    data: Voucher[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.voucherRepository.createQueryBuilder('voucher');

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(voucher.code) ILIKE unaccent(:term) OR unaccent(voucher.discount_type) ILIKE unaccent(:term) OR unaccent(voucher.status) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }

    const allowedSortFields = ['created_at', 'updated_at', 'code', 'discount_value', 'status'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`voucher.${sortField}`, sortDirection);
    queryBuilder.skip(skip).take(pageSize);

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

  async findOneVoucher(id: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher với id ${id} không tồn tại`);
    }
    return voucher;
  }

  async updateVoucher(id: string, updateVoucherDto: Partial<UpdateVoucherDto>): Promise<Voucher> {
    await this.voucherRepository.update(id, updateVoucherDto);
    return this.findOneVoucher(id);
  }

  async deleteVoucher(id: string): Promise<void> {
    const result = await this.voucherRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Mã giảm giá với ID ${id} không tồn tại`);
    }
  }
  //#endregion Voucher Operations

  //#region VoucherUser Operations
  async createVoucherUser(userId: string, voucherId: string, createVoucherUserDto: CreateVoucherUserDto): Promise<VoucherUser> {
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException(`Mã giảm giá với ID ${voucherId} không tồn tại`);
    }

    // Check if voucher has available quantity
    if (voucher.quantity <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết số lượng');
    }

    const currentDate = new Date();
    if (voucher.status !== VoucherStatusEnum.ACTIVE || currentDate < new Date(voucher.start_date) || currentDate > new Date(voucher.end_date)) {
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }

    const existingVoucherUser = await this.voucherUserRepository.findOne({
      where: { user_id: userId, voucher_id: voucherId},
    });
    if (existingVoucherUser) {
      throw new BadRequestException('Người dùng đã có mã giảm giá này');
    }

    const voucherUser = this.voucherUserRepository.create({
      user_id: userId,
      voucher_id: voucherId,
      status: VoucherUserStatusEnum.AVAILABLE,
      assigned_at: createVoucherUserDto.assigned_at || currentDate,
      used_at: null,
    });
    return this.voucherUserRepository.save(voucherUser);
  }

  async findAllVoucherUsers(query: FindVoucherUserDto): Promise<{
    data: VoucherUser[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.voucherUserRepository.createQueryBuilder('voucherUser')
      .leftJoinAndSelect('voucherUser.user', 'user')
      .leftJoinAndSelect('voucherUser.voucher', 'voucher');

    if (query.user_id) {
      queryBuilder.andWhere('voucherUser.user_id = :user_id', { user_id: query.user_id });
    }

    const currentDate = new Date();
    if (query.status) {
      if (query.status === 'active') {
        queryBuilder.andWhere('voucherUser.status = :status', { status: 'available' })
          .andWhere('voucher.status = :voucherStatus', { voucherStatus: 'active' })
          .andWhere('voucher.start_date <= :currentDate', { currentDate })
          .andWhere('voucher.end_date >= :currentDate', { currentDate });
      } else if (query.status === 'expired') {
        queryBuilder.andWhere('(voucher.status != :voucherStatus OR voucher.end_date < :currentDate)', { voucherStatus: 'active', currentDate });
      } else if (query.status === 'used') {
        queryBuilder.andWhere('voucherUser.status = :status', { status: 'used' });
      }
    }

    const allowedSortFields = ['assigned_at'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'assigned_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(`voucherUser.${sortField}`, sortDirection);

    queryBuilder.skip(skip).take(pageSize);

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

  async findOneVoucherUser(voucherId: string, userId: string): Promise<VoucherUser> {
    const voucherUser = await this.voucherUserRepository.findOne({
      where: { voucher_id: voucherId, user_id: userId },
      relations: ['user', 'voucher'],
    });
    if (!voucherUser) {
      throw new NotFoundException(`Bản ghi voucher-user với voucher_id ${voucherId} và user_id ${userId} không tồn tại`);
    }

    const currentDate = new Date();
    const voucher = voucherUser.voucher;
    if (
      currentDate >= new Date(voucher.start_date) &&
      currentDate <= new Date(voucher.end_date) &&
      voucherUser.status === VoucherUserStatusEnum.AVAILABLE
    ) {
      voucherUser['is_valid'] = true;
    } else {
      voucherUser['is_valid'] = false;
    }

    return voucherUser;
  }

  async useVoucher(voucherId: string, userId: string): Promise<VoucherUser> {
    const voucherUser = await this.findOneVoucherUser(voucherId, userId);

    if (voucherUser.status === VoucherUserStatusEnum.USED) {
      throw new BadRequestException('Mã giảm giá đã được sử dụng');
    }

    if (!voucherUser['is_valid']) {
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }

    voucherUser.status = VoucherUserStatusEnum.USED;
    voucherUser.used_at = new Date();
    return this.voucherUserRepository.save(voucherUser);
  }

  async deleteVoucherUser(voucherId: string, userId: string): Promise<void> {
    const result = await this.voucherUserRepository.delete({ voucher_id: voucherId, user_id: userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Bản ghi voucher-user với voucher_id ${voucherId} và user_id ${userId} không tồn tại`);
    }
  }

  // Add new method to update voucher usage
  async updateVoucherUsage(voucherId: string): Promise<void> {
    const voucher = await this.voucherRepository.findOne({ where: { id: voucherId } });
    if (!voucher) {
      throw new NotFoundException(`Mã giảm giá với ID ${voucherId} không tồn tại`);
    }

    if (voucher.quantity <= 0) {
      throw new BadRequestException('Mã giảm giá đã hết số lượng');
    }

    // Update quantity and usedCount
    voucher.quantity -= 1;
    voucher.usedCount += 1;

    await this.voucherRepository.save(voucher);
  }
  //#endregion VoucherUser Operations
}