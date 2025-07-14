import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
  UpdateCheckoutSessionDto,
} from './dto/checkout-sesion';

@Injectable()
export class CheckoutSessionService {
  private readonly SESSION_TTL = 900; // 15 minutes in seconds

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) { }

  private getSessionKey(userId: string | undefined, id: string | undefined): string {
    const identifier = userId || id;
    if (!identifier) {
      throw new BadRequestException('Không có ID người dùng hoặc ID phiên đặt chỗ');
    }
    return identifier;
  }

  async createSession(
    id: string,
    userId: string,
    sessionData: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionDto> {
    const sessionKey = this.getSessionKey(userId, id);

    // if (sessionData)

    const newSession: CheckoutSessionDto = {
      checkoutSessionId: sessionKey,
      userId: userId,
      ...sessionData,
    };

    // Store the session data in Redis
    await this.redisClient.set(
      sessionKey,
      JSON.stringify(newSession),
      'EX',
      this.SESSION_TTL
    );

    return newSession;
  }

  async getSession(userId?: string, id?: string): Promise<CheckoutSessionDto> {
    const sessionKey = this.getSessionKey(userId, id);
    const sessionData = await this.redisClient.get(sessionKey);

    if (!sessionData) {
      throw new NotFoundException('Không tìm thấy phiên đặt chỗ');
    }

    // Reset TTL on access
    await this.updateSessionTTL(userId, id);

    return JSON.parse(sessionData) as CheckoutSessionDto;
  }

  async deleteSession(userId?: string, id?: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(userId, id);
      await this.redisClient.del(sessionKey);
    } catch (error) {
      throw new BadRequestException('Không thể xóa phiên đặt chỗ');
    }
  }

  async updateSessionTTL(userId?: string, id?: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(userId, id);
      await this.redisClient.expire(sessionKey, this.SESSION_TTL);
    } catch (error) {
      throw new BadRequestException('Không thể cập nhật thời gian sống phiên đặt chỗ');
    }
  }

  async updateSessionData(
    sessionData: UpdateCheckoutSessionDto,
    userId?: string,
    id?: string,
  ): Promise<CheckoutSessionDto> {
    try {
      const sessionKey = this.getSessionKey(userId, id);
      const existingData = await this.getSession(userId, id);

      // Update the session data with new information
      const updatedData: CheckoutSessionDto = {
        ...existingData,
        ...sessionData,
      };

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
      throw new BadRequestException('Không thể cập nhật thông tin phiên đặt chỗ');
    }
  }

  async getSessionTTL(userId?: string, id?: string): Promise<number> {
    try {
      const sessionKey = this.getSessionKey(userId, id);
      return await this.redisClient.ttl(sessionKey);
    } catch (error) {
      throw new BadRequestException('Không thể lấy thời gian sống phiên đặt chỗ');
    }
  }
} 