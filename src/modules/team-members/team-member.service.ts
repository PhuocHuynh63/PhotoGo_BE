import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { FindTeamMemberDto } from './dto/find-team-member.dto';
import { Location } from '../locations/entities/location.entity';

@Injectable()
export class TeamMemberService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) { }

  //#region create
  async create(createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
    // Find the location first
    const location = await this.locationRepository.findOne({
      where: { id: createTeamMemberDto.location_id }
    });

    if (!location) {
      throw new NotFoundException(`Không tìm thấy location với ID ${createTeamMemberDto.location_id}`);
    }

    // Create team member with location relationship
    const teamMember = this.teamMemberRepository.create({
      ...createTeamMemberDto,
      location: location
    });

    return this.teamMemberRepository.save(teamMember);
  }
  //#endregion create

  //#region findAll
  async findAll(query: FindTeamMemberDto): Promise<{
    data: TeamMember[];
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
    const queryBuilder = this.teamMemberRepository.createQueryBuilder('teamMember');

    queryBuilder.leftJoinAndSelect('teamMember.location', 'location', 'location.id = :locationId', { locationId: query.location_id });

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(teamMember.full_name) ILIKE unaccent(:term) OR unaccent(teamMember.role) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['created_at', 'updated_at', 'full_name', 'role'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'created_at';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`teamMember.${sortField}`, sortDirection);
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
  async findOne(id: string): Promise<TeamMember> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { id },
      relations: ['vendor'],
    });
    if (!teamMember) {
      throw new NotFoundException(`TeamMember với ID ${id} không tồn tại`);
    }
    return teamMember;
  }
  //#endregion findOne
}