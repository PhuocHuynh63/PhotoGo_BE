import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CheckoutSessionDto } from './dto/checkout-sesion';

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
    sessionData: CheckoutSessionDto,
  ): Promise<{ checkoutSessionId: string; data: CheckoutSessionDto }> {
    const sessionKey = this.getSessionKey(userId, id);

    // If session exists, update it with new data
    await this.redisClient.set(
      sessionKey,
      JSON.stringify(sessionData),
      'EX',
      this.SESSION_TTL
    );

    return {
      checkoutSessionId: sessionKey,
      data: sessionData,
    };
  }

  async getSession(userId?: string, id?: string): Promise<{ checkoutSesionId: string; data: CheckoutSessionDto }> {
    const sessionKey = this.getSessionKey(userId, id);
    const sessionData = await this.redisClient.get(sessionKey);

    if (!sessionData) {
      throw new NotFoundException('Không tìm thấy phiên đặt chỗ');
    }

    // Reset TTL on access
    await this.updateSessionTTL(userId, id);

    return {
      checkoutSesionId: sessionKey,
      data: JSON.parse(sessionData) as CheckoutSessionDto
    };
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
    sessionData: string,
    userId?: string,
    id?: string,
  ): Promise<string> {
    try {
      const sessionKey = this.getSessionKey(userId, id);
      const existingData = await this.getSession(userId, id);

      if (typeof existingData === 'object' && 'message' in existingData) {
        throw new NotFoundException('Không tìm thấy phiên đặt chỗ');
      }

      await this.redisClient.set(
        sessionKey,
        sessionData,
        'EX',
        this.SESSION_TTL
      );

      return sessionData;
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