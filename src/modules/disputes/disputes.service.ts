import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Dispute } from './entities/dispute.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { FindDisputeDto } from './dto/find-dispute.dto';
import { DisputeStatus } from 'src/constants/booking.enum';
import { UpdateDisputeDto } from './dto/update-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
  ) {}

  async create(createDisputeDto: CreateDisputeDto): Promise<Dispute> {
    try {
      const dispute = this.disputeRepository.create({
        ...createDisputeDto,
        status: DisputeStatus.OPEN,
      });
      return await this.disputeRepository.save(dispute);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Khiếu nại cho đơn đặt chỗ này đã tồn tại');
      }
      throw new BadRequestException('Dữ liệu không hợp lệ');
    }
  }

  async findAll(findDisputeDto: FindDisputeDto): Promise<{
    data: Dispute[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    const currentPage = findDisputeDto.current ? Number(findDisputeDto.current) : 1;
    const pageSize = findDisputeDto.pageSize ? Number(findDisputeDto.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;

    const queryBuilder = this.disputeRepository.createQueryBuilder('dispute');
    queryBuilder.leftJoinAndSelect('dispute.booking', 'booking');
    queryBuilder.leftJoinAndSelect('dispute.user', 'user');

    if (findDisputeDto.bookingId) {
      queryBuilder.andWhere('dispute.bookingId = :bookingId', { bookingId: findDisputeDto.bookingId });
    }

    if (findDisputeDto.userId) {
      queryBuilder.andWhere('dispute.userId = :userId', { userId: findDisputeDto.userId });
    }

    if (findDisputeDto.status) {
      queryBuilder.andWhere('dispute.status = :status', { status: findDisputeDto.status });
    }

    if (findDisputeDto.term) {
      queryBuilder.andWhere(
        '(unaccent(dispute.description) ILIKE unaccent(:term))',
        { term: `%${findDisputeDto.term}%` },
      );
    }

    const [data, totalItem] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

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

  async findOne(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({
      where: { id },
      relations: ['booking', 'user'],
    });

    if (!dispute) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    return dispute;
  }

  async update(id: string, updateDisputeDto: UpdateDisputeDto): Promise<Dispute> {
    const dispute = await this.findOne(id);
    Object.assign(dispute, updateDisputeDto);
    return await this.disputeRepository.save(dispute);
  }

  async remove(id: string): Promise<void> {
    const dispute = await this.findOne(id);
    await this.disputeRepository.remove(dispute);
  }
} 