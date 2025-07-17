import { Controller, Get, Post, Body, Query, Param, Patch, Delete } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignVoucher } from './entities/campaign-voucher.entity';
import { UserCampaign } from './entities/user-campaign.entity';
import { LoyaltyCampaign } from './entities/loyalty-campaign.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Public } from 'src/decorator/custom';
import { FindAllDto, FindAllVendorWithInvitedDto } from './dto/find-all.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateLoyaltyCampaignDto } from './dto/create-loyalty-campaign.dto';
import { CreateMultipleCampaignVoucherDto } from './dto/create-campaign-voucher.dto';
import { CreateMultipleUserCampaignDto } from './dto/create-user-campaign.dto';
import { CampaignVoucherStatusDto, UpdateCampaignStatusDto, UpdateUserCampaignStatusDto } from './dto/update-status.dto';
import { PaginationDto } from './dto/pagination.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { JoinWelcomeCampaignDto } from './dto/join-welcome-campaign.dto';
import { VoucherUser } from '../vouchers/entities/voucher-user.entity';
import { CampaignVendor } from './entities/campaign-vendor.entity';
import { InviteVendorDto } from './dto/invite-vendor.dto';
import { ConfirmVendorInviteDto } from './dto/confirm-vendor-invite.dto';

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
  async findAll(@Query() query: FindAllDto, @Query('showAll') showAll?: string) {
    return this.campaignService.findAllCampaigns({ ...query, showAll });
  }

  @Get('vendor/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin campaign-vendor theo id' })
  @ApiParam({ name: 'id', description: 'ID của campaign-vendor' })
  @ApiResponse({ status: 200, description: 'Thông tin campaign-vendor', type: CampaignVendor })
  async getCampaignVendorById(@Param('id') id: string): Promise<CampaignVendor> {
    return this.campaignService.getCampaignVendorById(id);
  }

  @Get('vendor/:campaignId/invited')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách vendor đã được gửi mail xác nhận chưa?' })
  @ApiParam({ name: 'campaignId', description: 'ID của campaign' })
  // @ApiResponse({ status: 200, description: 'Danh sách vendor đã được gửi mail xác nhận', schema: {
  //   properties: {
  //     data: { type: 'array', items: { $ref: '#/components/schemas/CampaignVendor' } },
  //     pagination: {
  //       type: 'object',
  //       properties: {
  //         current: { type: 'number' },
  //         pageSize: { type: 'number' },
  //         totalPage: { type: 'number' },
  //         totalItem: { type: 'number' }
  //       }
  //     }
  //   }
  // } })
  async getVendorInvitedByCampaignId(@Param('campaignId') campaignId: string, @Query() query: FindAllVendorWithInvitedDto): Promise<{ data: CampaignVendor[], pagination: { current: number, pageSize: number, totalPage: number, totalItem: number } }> {
    return this.campaignService.getVendorInvitedByCampaignId(campaignId, query);
  }

   // API nhập vendorId để list campaign vendor đã tham gia hoặc tự tạo
   @Get('by-vendor')
   @Public()
   @ApiOperation({ summary: 'Lấy danh sách campaign mà vendor đã tham gia hoặc tự tạo' })
   @ApiQuery({ name: 'vendorId', description: 'ID của vendor', required: true })
   @ApiQuery({ name: 'current', description: 'Trang hiện tại', required: false, type: Number, example: 1 })
   @ApiQuery({ name: 'pageSize', description: 'Số lượng mỗi trang', required: false, type: Number, example: 10 })
   @ApiResponse({ status: 200, description: 'Danh sách campaign', type: [Campaign] })
   async findCampaignsByVendorId(
     @Query('vendorId') vendorId: string,
     @Query('current') current?: number,
     @Query('pageSize') pageSize?: number
   ) {
     return this.campaignService.findCampaignsByVendorId(vendorId, Number(current) || 1, Number(pageSize) || 10);
   }

  @Get('confirm-invite')
  @Public()
  @ApiOperation({ summary: 'Xác nhận vendor tham gia campaign qua link trong email' })
  async confirmVendorInvite(@Query('token') token: string) {
    return this.campaignService.confirmVendorInvite(token);
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

  @Post('invite-vendor')
  @ApiOperation({ summary: 'Mời vendor tham gia campaign (gửi mail xác nhận)' })
  async inviteVendorToCampaign(@Body() inviteVendorDto: InviteVendorDto) {
    return this.campaignService.inviteVendorToCampaign(inviteVendorDto);
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

  @Post('welcome/join')
  @ApiOperation({ summary: 'Thêm user vào campaign "Chào Bạn Mới"' })
  @ApiResponse({ 
    status: 201, 
    description: 'User đã được thêm vào campaign thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        userCampaign: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            campaignId: { type: 'string' },
            isAvailable: { type: 'boolean' },
            joinedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  async joinWelcomeCampaign(@Body() joinWelcomeCampaignDto: JoinWelcomeCampaignDto): Promise<{
    message: string;
    userCampaign: UserCampaign;
    voucherUser: VoucherUser;
  }> {
    return this.campaignService.joinWelcomeCampaign(
      joinWelcomeCampaignDto.userId,
      joinWelcomeCampaignDto.note
    );
  }

  // CRUD cho campaign-vendor
  @Post('vendor')
  @ApiOperation({ summary: 'Tạo campaign-vendor (gán vendor cho campaign)' })
  @ApiQuery({ name: 'campaignId', description: 'ID của campaign', required: true })
  @ApiQuery({ name: 'vendorId', description: 'ID của vendor', required: true })
  @ApiResponse({ status: 201, description: 'Tạo campaign-vendor thành công', type: CampaignVendor })
  async createCampaignVendor(@Query('campaignId') campaignId: string, @Query('vendorId') vendorId: string): Promise<CampaignVendor> {
    return this.campaignService.createCampaignVendor(campaignId, vendorId);
  }

  
  @Patch('vendor/:id')
  @ApiOperation({ summary: 'Cập nhật vendor cho campaign-vendor' })
  @ApiParam({ name: 'id', description: 'ID của campaign-vendor' })
  @ApiQuery({ name: 'vendorId', description: 'ID của vendor', required: true })
  @ApiQuery({ name: 'isAvailable', description: 'Trạng thái của campaign-vendor', required: true })
  @ApiResponse({ status: 200, description: 'Cập nhật campaign-vendor thành công', type: CampaignVendor })
  async updateCampaignVendor(@Param('id') id: string, @Query('vendorId') vendorId: string, @Query('isAvailable') isAvailable: boolean): Promise<CampaignVendor> {
    return this.campaignService.updateCampaignVendor(id, vendorId, isAvailable);
  }

  @Delete('vendor/:id/delete')
  @ApiOperation({ summary: 'Xóa campaign-vendor' })
  @ApiParam({ name: 'id', description: 'ID của campaign-vendor' })
  @ApiResponse({ status: 200, description: 'Xóa campaign-vendor thành công', schema: { properties: { message: { type: 'string' } } } })
  async deleteCampaignVendor(@Param('id') id: string): Promise<{ message: string }> {
    return this.campaignService.deleteCampaignVendor(id);
  }
} 