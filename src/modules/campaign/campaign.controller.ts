import { Controller, Get, Post, Body, Query, Param, Patch } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignVoucher } from './entities/campaign-voucher.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { LoyaltyCampaign } from './entities/loyalty-campaign.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';
import { Public } from 'src/decorator/custom';
import { FindAllDto } from './dto/find-all.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateLoyaltyCampaignDto } from './dto/create-loyalty-campaign.dto';
import { CreateMultipleCampaignVoucherDto } from './dto/create-campaign-voucher.dto';
import { CreateMultipleUserCampaignDto } from './dto/create-user-campaign.dto';
import { CampaignVoucherStatusDto, UpdateCampaignStatusDto, UpdateUserCampaignStatusDto } from './dto/update-status.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';

@Controller('campaigns')
@ApiTags('Campaigns')
@ApiBearerAuth('access-token')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  // Campaign endpoints
  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách campaign' })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách campaign',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'boolean' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            pageSize: { type: 'number' },
            totalPage: { type: 'number' },
            totalItem: { type: 'number' }
          }
        }
      }
    }
  })
  async findAllCampaigns(@Query() findAllDto: FindAllDto) {
    return this.campaignService.findAllCampaigns(findAllDto);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo campaign mới' })
  @ApiResponse({ 
    status: 201, 
    description: 'Campaign đã được tạo thành công', 
    type: Campaign 
  })
  async createCampaign(@Body() createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    return this.campaignService.createCampaign(createCampaignDto);
  }

  // Campaign Voucher endpoints
  @Get(':campaignId/vouchers')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách voucher của campaign' })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách voucher của campaign',
    schema: {
      properties: {
        campaign: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        vouchers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              voucherId: { type: 'string' },
              assignedAt: { type: 'string', format: 'date-time' },
              isAvailable: { type: 'boolean' },
              voucher: { type: 'object' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            pageSize: { type: 'number' },
            totalPage: { type: 'number' },
            totalItem: { type: 'number' }
          }
        }
      }
    }
  })
  async findCampaignVouchers(
    @Param('campaignId') campaignId: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.campaignService.findCampaignVouchers(campaignId, paginationDto);
  }

  @Post(':campaignId/vouchers/:voucherId')
  @ApiOperation({ summary: 'Thêm voucher vào campaign' })
  @ApiResponse({ status: 201, description: 'Voucher đã được thêm vào campaign', type: CampaignVoucher })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  @ApiParam({ name: 'voucherId', description: 'ID của voucher' })
  async createCampaignVoucher(
    @Param('campaignId') campaignId: string,
    @Param('voucherId') voucherId: string,
  ): Promise<CampaignVoucher> {
    return this.campaignService.createCampaignVoucher({ campaignId, voucherId });
  }

  @Post(':campaignId/vouchers')
  @ApiOperation({ summary: 'Thêm nhiều voucher vào campaign' })
  @ApiResponse({ 
    status: 201, 
    description: 'Các voucher đã được thêm vào campaign', 
    type: [CampaignVoucher] 
  })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  async createMultipleCampaignVouchers(
    @Param('campaignId') campaignId: string,
    @Body() createMultipleCampaignVoucherDto: CreateMultipleCampaignVoucherDto,
  ): Promise<CampaignVoucher[]> {
    return this.campaignService.createMultipleCampaignVouchers(
      campaignId,
      createMultipleCampaignVoucherDto.voucherIds,
    );
  }

  // User Campaign endpoints
  @Get(':campaignId/users')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách user của campaign' })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách user của campaign',
    schema: {
      properties: {
        campaign: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        userCampaigns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              isAvailable: { type: 'boolean' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  fullName: { type: 'string' }
                }
              }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            pageSize: { type: 'number' },
            totalPage: { type: 'number' },
            totalItem: { type: 'number' }
          }
        }
      }
    }
  })
  async findAllUserCampaigns(
    @Param('campaignId') campaignId: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.campaignService.findAllUserCampaigns(campaignId, paginationDto);
  }

  @Post(':campaignId/users/:userId')
  @ApiOperation({ summary: 'Thêm user vào campaign' })
  @ApiResponse({ status: 201, description: 'User đã được thêm vào campaign', type: UserCampaign })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  async createUserCampaign(
    @Param('campaignId') campaignId: string,
    @Param('userId') userId: string,
  ): Promise<UserCampaign> {
    return this.campaignService.createUserCampaign({ campaignId, userId });
  }

  @Post(':campaignId/users')
  @ApiOperation({ summary: 'Thêm nhiều user vào campaign' })
  @ApiResponse({ 
    status: 201, 
    description: 'Các user đã được thêm vào campaign', 
    type: [UserCampaign] 
  })
  @ApiBody({ 
    description: 'Danh sách user cần thêm vào campaign',
    schema: {
      type: 'object',
      properties: {
        userIds: { type: 'array', items: { type: 'string' }, example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'], description: 'Danh sách user cần thêm vào campaign' }
      },
      required: ['userIds'],
    },
   })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  async createMultipleUserCampaigns(
    @Param('campaignId') campaignId: string,
    @Body() createMultipleUserCampaignDto: CreateMultipleUserCampaignDto,
  ): Promise<{ message: string; errors: string[]; successfulUsers: string[] }> {
    return this.campaignService.createMultipleUserCampaigns(
      campaignId,
      createMultipleUserCampaignDto,
    );
  }

  // Loyalty Campaign endpoints
  @Get('loyalty')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách campaign loyalty' })
  @ApiResponse({ status: 200, description: 'Danh sách campaign loyalty', type: [LoyaltyCampaign] })
  async findAllLoyaltyCampaigns(@Query() findAllDto: FindAllDto) {
    return this.campaignService.findAllLoyaltyCampaigns(findAllDto);
  }

  @Post('loyalty')
  @ApiOperation({ summary: 'Tạo campaign loyalty' })
  @ApiResponse({ status: 201, description: 'Campaign loyalty đã được tạo', type: LoyaltyCampaign })
  async createLoyaltyCampaign(@Body() createLoyaltyCampaignDto: CreateLoyaltyCampaignDto): Promise<LoyaltyCampaign> {
    return this.campaignService.createLoyaltyCampaign(createLoyaltyCampaignDto);
  }

  @Patch(':campaignId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái của campaign' })
  @ApiResponse({ status: 200, description: 'Campaign đã được cập nhật trạng thái', type: Campaign })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  async updateCampaignStatus(@Param('campaignId') campaignId: string, @Body() updateCampaignStatusDto: UpdateCampaignStatusDto): Promise<Campaign> {
    return this.campaignService.updateCampaignStatus(campaignId, updateCampaignStatusDto);
  }

  @Patch(':campaignId/users/:userId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái của user campaign' })
  @ApiResponse({ status: 200, description: 'User campaign đã được cập nhật trạng thái', type: UserCampaign })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  async updateUserCampaignStatus(@Param('campaignId') campaignId: string, @Param('userId') userId: string, @Body() updateUserCampaignStatusDto: UpdateUserCampaignStatusDto): Promise<UserCampaign> {
    return this.campaignService.updateUserCampaignStatus(campaignId, userId, updateUserCampaignStatusDto);
  }

  @Patch(':campaignId/vouchers/:voucherId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái của voucher campaign' })
  @ApiResponse({ status: 200, description: 'Voucher campaign đã được cập nhật trạng thái', type: CampaignVoucher })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  @ApiParam({ name: 'voucherId', description: 'ID của voucher' })
  async updateCampaignVoucherStatus(@Param('campaignId') campaignId: string, @Param('voucherId') voucherId: string, @Body() updateCampaignVoucherStatusDto: CampaignVoucherStatusDto): Promise<CampaignVoucher> {
    return this.campaignService.updateCampaignVoucherStatus(campaignId, voucherId, updateCampaignVoucherStatusDto);
  }
} 