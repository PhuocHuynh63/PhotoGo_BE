import { Controller, Get, Post, Body, Query, Param, Res } from '@nestjs/common';
import { TeamMemberService } from './team-member.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { TeamMember } from './entities/team-member.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindTeamMemberDto } from './dto/find-team-member.dto';

@ApiTags('Team-members')
@Controller('team-members')
@ApiBearerAuth('access-token')
export class TeamMemberController {
  constructor(private readonly teamMemberService: TeamMemberService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo thành viên nhóm mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Thành viên nhóm đã được tạo thành công', type: TeamMember })
  @ApiResponse({ status: 401, description: 'Không được phép' })
  @ResponseMessage('Tạo thành viên nhóm thành công')
  async create(@Body() createTeamMemberDto: CreateTeamMemberDto): Promise<TeamMember> {
    return this.teamMemberService.create(createTeamMemberDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả thành viên nhóm (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thành viên nhóm với phân trang',
    type: [TeamMember],
  })
  @ResponseMessage('Lấy danh sách thành viên nhóm thành công')
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
  @ApiOperation({ summary: 'Lấy thành viên nhóm theo ID (Public)' })
  @ApiResponse({ status: 200, description: 'Thành viên nhóm đã được tìm thấy', type: TeamMember })
  @ApiResponse({ status: 404, description: 'Thành viên nhóm không tồn tại' })
  async findOne(@Param('id') id: string): Promise<TeamMember> {
    return this.teamMemberService.findOne(id);
  }
}