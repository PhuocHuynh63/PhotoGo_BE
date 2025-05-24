import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Injectable()
export class CheckoutSessionService {
  private readonly SESSION_TTL = 900; // 15 minutes in seconds
  private readonly SESSION_PREFIX = 'checkout_session';

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  private getSessionKey(userId: string | undefined, deviceId: string | undefined): string {
    const identifier = userId || deviceId;
    if (!identifier) {
      throw new BadRequestException('Không có ID người dùng hoặc ID thiết bị');
    }
    return `${this.SESSION_PREFIX}:${identifier}`;
  }

  async createSession(
    createCheckoutSessionDto: CreateCheckoutSessionDto,
    userId?: string,
    deviceId?: string,
  ): Promise<{ message: string; key: string; data: CreateCheckoutSessionDto }> {
    try {
      const sessionKey = this.getSessionKey(userId, deviceId);
      
      // Check if session already exists
      const existingSession = await this.redisClient.get(sessionKey);
      if (existingSession) {
        throw new BadRequestException('Phiên đặt chỗ đã tồn tại');
      }

      await this.redisClient.set(
        sessionKey,
        JSON.stringify(createCheckoutSessionDto),
        'EX',
        this.SESSION_TTL
      );

      return {
        message: 'Phiên đặt chỗ đã được lưu thành công',
        key: sessionKey,
        data: createCheckoutSessionDto,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Không thể tạo phiên đặt chỗ');
    }
  }

  async getSession(userId?: string, deviceId?: string): Promise<CreateCheckoutSessionDto | { message: string }> {
    try {
      const sessionKey = this.getSessionKey(userId, deviceId);
      
      const sessionData = await this.redisClient.get(sessionKey);
      
      if (!sessionData) {
        return {
          message: 'Không tìm thấy phiên đặt chỗ',
        };
      }

      const parsedData = JSON.parse(sessionData);
      
      // Reset TTL on access
      await this.updateSessionTTL(userId, deviceId);
      
      return parsedData;
    } catch (error) {
      throw new BadRequestException('Không thể lấy phiên đặt chỗ');
    }
  }

  async deleteSession(userId?: string, deviceId?: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(userId, deviceId);
      await this.redisClient.del(sessionKey);
    } catch (error) {
      throw new BadRequestException('Không thể xóa phiên đặt chỗ');
    }
  }

  async updateSessionTTL(userId?: string, deviceId?: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(userId, deviceId);
      await this.redisClient.expire(sessionKey, this.SESSION_TTL);
    } catch (error) {
      throw new BadRequestException('Không thể cập nhật thời gian sống phiên đặt chỗ');
    }
  }

  async updateSessionData(
    data: Partial<CreateCheckoutSessionDto>,
    userId?: string,
    deviceId?: string,
  ): Promise<CreateCheckoutSessionDto> {
    try {
      const sessionKey = this.getSessionKey(userId, deviceId);
      const existingData = await this.getSession(userId, deviceId);

      if ('message' in existingData) {
        throw new NotFoundException('Không tìm thấy phiên đặt chỗ');
      }

      const updatedData = { ...existingData, ...data };
      await this.redisClient.set(
        sessionKey,
        JSON.stringify(updatedData),
        'EX',
        this.SESSION_TTL
      );

      return updatedData;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể cập nhật dữ liệu phiên đặt chỗ');
    }
  }

  async getSessionTTL(userId?: string, deviceId?: string): Promise<number> {
    try {
      const sessionKey = this.getSessionKey(userId, deviceId);
      return await this.redisClient.ttl(sessionKey);
    } catch (error) {
      throw new BadRequestException('Không thể lấy thời gian sống phiên đặt chỗ');
    }
  }
} 