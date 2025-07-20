import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { OverviewService } from './overview.service';
import { OverviewDto } from './dto/overview.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorator/custom';

@Controller('overview')
@ApiTags('Overview')
@ApiBearerAuth('access-token')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('statistics')
  @Public()
  async getStatistics(@Query() query: OverviewDto) {
    return this.overviewService.getStatistics(query);
  }

  @Post('export-excel')
  async exportToExcel(@Query() query: OverviewDto, @Res() res: Response) {
    return this.overviewService.exportToExcel(query, res);
  }

  @Get('dashboard')
  async getDashboardData() {
    return this.overviewService.getDashboardData();
  }
} 