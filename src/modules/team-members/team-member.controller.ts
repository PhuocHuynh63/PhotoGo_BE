import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { TeamMemberService } from './team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { TeamMember } from './entities/team-member.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindTeamMemberDto } from './dto/find-team-member.dto';

@ApiTags('Team-members')
@Controller('team-members')
@ApiBearerAuth('access-token')
export class TeamMemberController {
  constructor(private readonly teamMemberService: TeamMemberService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team member (Protected)' })
  @ApiResponse({ status: 201, description: 'Team Member created successfully', type: TeamMember })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
    return this.teamMemberService.create(createTeamMemberDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all team members (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of team members with pagination',
    type: [TeamMember],
  })
  async findAll(@Query() query: FindTeamMemberDto): Promise<{
    data: TeamMember[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.teamMemberService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a team member by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Team Member found', type: TeamMember })
  @ApiResponse({ status: 404, description: 'Team Member not found' })
  async findOne(@Param('id') id: string): Promise<TeamMember> {
    return this.teamMemberService.findOne(id);
  }
}