import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CampaignEngineService } from './campaign-engine.service';
import { CampaignRuleService, CampaignEvent } from './services/campaign-rule.service';
import { TriggerType } from './entities/campaign-trigger.entity';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from 'src/decorator/role.decorator';
import { Role } from '../roles/entities/role.entity';
import { ApiBearerAuth } from '@nestjs/swagger';

// DTOs
export class TriggerEventDto {
  eventType: TriggerType;
  userId: string;
  userData?: any;
  orderData?: any;
  eventData?: any;
}

export class UserRegistrationDto {
  userId: string;
  userData?: any;
}

export class OrderCompletedDto {
  userId: string;
  orderData?: any;
}

export class CustomEventDto {
  userId: string;
  eventData?: any;
}

@Controller('campaign-engine')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignEngineController {
  constructor(
    private campaignEngineService: CampaignEngineService,
    private campaignRuleService: CampaignRuleService,
  ) {}

  /**
   * Trigger a custom campaign event
   */
  @Post('trigger-event')
  // @Roles(Role.ADMIN)
  async triggerEvent(@Body() eventDto: TriggerEventDto) {
    try {
      const event: CampaignEvent = {
        eventType: eventDto.eventType,
        userId: eventDto.userId,
        userData: eventDto.userData,
        orderData: eventDto.orderData,
        eventData: eventDto.eventData,
      };

      await this.campaignEngineService.processEvent(event);

      return {
        success: true,
        message: 'Event processed successfully',
        event: eventDto,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger user registration event
   */
  @Post('user-registered')
  // @Roles('admin')
  async onUserRegistered(@Body() dto: UserRegistrationDto) {
    try {
      await this.campaignEngineService.onUserRegistered(dto.userId, dto.userData);

      return {
        success: true,
        message: 'User registration event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process user registration event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger user birthday event
   */
  @Post('user-birthday')
  // @Roles('admin')
  async onUserBirthday(@Body() dto: UserRegistrationDto) {
    try {
      await this.campaignEngineService.onUserBirthday(dto.userId, dto.userData);

      return {
        success: true,
        message: 'User birthday event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process user birthday event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger order completed event
   */
  @Post('order-completed')
  // @Roles('admin')
  async onOrderCompleted(@Body() dto: OrderCompletedDto) {
    try {
      await this.campaignEngineService.onOrderCompleted(dto.userId, dto.orderData);

      return {
        success: true,
        message: 'Order completed event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process order completed event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger first purchase event
   */
  @Post('first-purchase')
  // @Roles('admin')
  async onFirstPurchase(@Body() dto: OrderCompletedDto) {
    try {
      await this.campaignEngineService.onFirstPurchase(dto.userId, dto.orderData);

      return {
        success: true,
        message: 'First purchase event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process first purchase event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger total spent event
   */
  @Post('total-spent')
  // @Roles('admin')
  async onTotalSpent(@Body() dto: OrderCompletedDto) {
    try {
      await this.campaignEngineService.onTotalSpent(dto.userId, dto.orderData);

      return {
        success: true,
        message: 'Total spent event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process total spent event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger holiday event
   */
  @Post('holiday-event')
  // @Roles('admin')
  async onHolidayEvent(@Body() dto: CustomEventDto) {
    try {
      await this.campaignEngineService.onHolidayEvent(dto.userId, dto.eventData);

      return {
        success: true,
        message: 'Holiday event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process holiday event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger custom event
   */
  @Post('custom-event')
  // @Roles('admin')
  async onCustomEvent(@Body() dto: CustomEventDto) {
    try {
      await this.campaignEngineService.onCustomEvent(dto.userId, dto.eventData);

      return {
        success: true,
        message: 'Custom event processed successfully',
        userId: dto.userId,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process custom event',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Manually trigger a specific campaign
   */
  @Post('trigger-campaign/:campaignId')
  // @Roles('admin')
  async triggerCampaign(
    @Param('campaignId') campaignId: string,
    @Body() eventDto: TriggerEventDto,
  ) {
    try {
      const event: CampaignEvent = {
        eventType: eventDto.eventType,
        userId: eventDto.userId,
        userData: eventDto.userData,
        orderData: eventDto.orderData,
        eventData: eventDto.eventData,
      };

      await this.campaignEngineService.triggerCampaign(campaignId, event);

      return {
        success: true,
        message: 'Campaign triggered successfully',
        campaignId,
        event: eventDto,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to trigger campaign',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get available trigger types
   */
  @Get('trigger-types')
  // @Roles('admin')
  async getTriggerTypes() {
    return {
      success: true,
      triggerTypes: Object.values(TriggerType),
    };
  }
} 