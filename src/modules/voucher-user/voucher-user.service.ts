import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherUser } from './entities/voucher-user.entity';
import { CreateVoucherUserDto } from './dto/create-voucher-user.dto';
import { FindVoucherUserDto } from './dto/find-voucher-user.dto';
import { Voucher } from '../vouchers/entities/voucher.entity';

@Injectable()
export class VoucherUserService {
  constructor(
    @InjectRepository(VoucherUser)
    private readonly voucherUserRepository: Repository<VoucherUser>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async create(createVoucherUserDto: CreateVoucherUserDto): Promise<VoucherUser> {
    const voucher = await this.voucherRepository.findOne({ where: { id: createVoucherUserDto.voucher_id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${createVoucherUserDto.voucher_id} not found`);
    }

    const currentDate = new Date();
    if (voucher.status !== 'active' || currentDate < new Date(voucher.start_date) || currentDate > new Date(voucher.end_date)) {
      throw new BadRequestException('Voucher is not valid or has expired');
    }

    const existingVoucherUser = await this.voucherUserRepository.findOne({
      where: { user_id: createVoucherUserDto.user_id, voucher_id: createVoucherUserDto.voucher_id },
    });
    if (existingVoucherUser) {
      throw new BadRequestException('User already has this voucher');
    }

    const voucherUser = this.voucherUserRepository.create({
      user_id: createVoucherUserDto.user_id,
      voucher_id: createVoucherUserDto.voucher_id,
      status: createVoucherUserDto.status || 'available',
    });
    return this.voucherUserRepository.save(voucherUser);
  }

  async findAll(query: FindVoucherUserDto): Promise<{
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

  async findOne(voucherId: string, userId: string): Promise<VoucherUser> {
    const voucherUser = await this.voucherUserRepository.findOne({
      where: { voucher_id: voucherId, user_id: userId },
      relations: ['user', 'voucher'],
    });
    if (!voucherUser) {
      throw new NotFoundException(`VoucherUser with voucher_id ${voucherId} and user_id ${userId} not found`);
    }

    const currentDate = new Date();
    const voucher = voucherUser.voucher;
    if (
      voucher.status === 'active' &&
      currentDate >= new Date(voucher.start_date) &&
      currentDate <= new Date(voucher.end_date) &&
      voucherUser.status === 'available'
    ) {
      voucherUser['is_valid'] = true;
    } else {
      voucherUser['is_valid'] = false;
    }

    return voucherUser;
  }

  async useVoucher(voucherId: string, userId: string): Promise<VoucherUser> {
    const voucherUser = await this.findOne(voucherId, userId);

    if (voucherUser.status === 'used') {
      throw new BadRequestException('Voucher has already been used');
    }

    if (!voucherUser['is_valid']) {
      throw new BadRequestException('Voucher is not valid or has expired');
    }

    voucherUser.voucher.status = 'used'; // Update the voucher status to 'used'
    voucherUser.used_at = new Date();
    return this.voucherUserRepository.save(voucherUser);
  }
}