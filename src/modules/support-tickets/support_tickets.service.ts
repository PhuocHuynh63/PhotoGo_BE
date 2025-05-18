import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SupportTicket } from './entities/support_ticket.entity';
import { CreateSupportTicketDto } from './dto/create-support_ticket.dto';
import { FindSupportTicketDto } from './dto/FindSupportTicketDto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SupportTicketService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    private readonly dataSource: DataSource,
  ) { }

  async create(createSupportTicketDto: CreateSupportTicketDto, userId: string): Promise<SupportTicket> {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
      }

      const supportTicket = manager.getRepository(SupportTicket).create({
        subject: createSupportTicketDto.subject,
        description: createSupportTicketDto.description,
        status: createSupportTicketDto.status,
        user,
      });

      return await manager.getRepository(SupportTicket).save(supportTicket);
    });
  }

  async findAll(query: FindSupportTicketDto): Promise<{
    data: SupportTicket[];
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

    const queryBuilder = this.supportTicketRepository.createQueryBuilder('supportTicket');
    queryBuilder.leftJoinAndSelect('supportTicket.user', 'user');

    if (query.term) {
      queryBuilder.andWhere(
        '(supportTicket.subject ILIKE :term OR supportTicket.description ILIKE :term)',
        { term: `%${query.term}%` },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('supportTicket.status = :status', { status: query.status });
    }

    const allowedSortFields = ['created_at', 'updated_at', 'subject'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`supportTicket.${sortField}`, sortDirection);
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

  async findOne(id: string): Promise<SupportTicket> {
    const supportTicket = await this.supportTicketRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!supportTicket) {
      throw new NotFoundException(`Vé hỗ trợ với ID ${id} không tồn tại`);
    }
    return supportTicket;
  }

  async updateSupportTicket(id: string, updateSupportTicketDto: Partial<CreateSupportTicketDto>): Promise<SupportTicket> {
    const supportTicket = await this.supportTicketRepository.findOne({ where: { id } });
    if (!supportTicket) {
      throw new NotFoundException(`Vé hỗ trợ với ID ${id} không tồn tại`);
    }
  
    Object.assign(supportTicket, updateSupportTicketDto);
    return await this.supportTicketRepository.save(supportTicket);
  }
  

  async deleteSupportTicket(id: string): Promise<void> {
    const supportTicket = await this.supportTicketRepository.findOne({ where: { id } });
    if (!supportTicket) {
      throw new NotFoundException(`Vé hỗ trợ với ID ${id} không tồn tại`);
    }

    try {
      await this.supportTicketRepository.remove(supportTicket);
    } catch (error) {
      throw new BadRequestException(`Lỗi xóa vé hỗ trợ với ID ${id}: ${error.message}`);
    }
  }
}