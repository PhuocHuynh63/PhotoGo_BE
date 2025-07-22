import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
  UpdateCheckoutSessionDto,
} from './dto/checkout-sesion';
import { ConceptRangeType } from 'src/constants/servicePackage.enum';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CheckoutSessionService {
  private readonly SESSION_TTL = 900; // 15 minutes in seconds

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    // Check user role before creating session
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }
    if (user.role?.name === 'vendor_owner' || user.role?.name === 'admin') {
      throw new BadRequestException('Vendor owner và admin không được phép đặt lịch');
    }

    const sessionKey = this.getSessionKey(userId, id);

    let newSession: CheckoutSessionDto;

    // Validate and create session based on concept range type
    if (sessionData.conceptRangeType === ConceptRangeType.SINGLE_DAY) {
      newSession = {
        checkoutSessionId: sessionKey,
        userId: userId,
        ...sessionData,
        multiDaysBookingDetails: undefined,
      };
    } else if (sessionData.conceptRangeType === ConceptRangeType.MULTIPLE_DAYS) {
      newSession = {
        checkoutSessionId: sessionKey,
        userId: userId,
        ...sessionData,
        singleDayBookingDetails: undefined,
      };
    } else {
      throw new BadRequestException('Loại phạm vi concept không hợp lệ');
    }

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