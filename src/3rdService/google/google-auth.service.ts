import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../modules/users/user.service';
import { Role } from '../../modules/roles/entities/role.entity';
import { RoleService } from 'src/modules/roles/role.service';
import { UserStatus } from 'src/constants/user.enum';
import { Logger } from '@nestjs/common';
import { SubscriptionStatus } from 'src/constants/subscription.enum';
import { SubscriptionService } from 'src/modules/subscription/subscription.service';

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    this.client = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  async loginOrSignup(user: any): Promise<{ user: any; access_token_jwt: string }> {
    const googleAuthDto = {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    // Tìm người dùng trong cơ sở dữ liệu thông qua UserService
    let existingUser = await this.userService.findOneEmail(googleAuthDto.email);
    const subscription = await this.subscriptionService.findSubscriptionByUserId(existingUser.id, SubscriptionStatus.ACTIVE);

    if (!existingUser) {
      // Nếu không tồn tại, tạo mới
      const createAuthDto = {
        fullName: googleAuthDto.name,
        email: googleAuthDto.email,
        avatarUrl: googleAuthDto.avatar,
        passwordHash: '',
        phoneNumber: '',
        status: UserStatus.ACTIVE,
        auth: 'google',
      };

      existingUser = await this.userService.create(createAuthDto);
    }

    // Kiểm tra trạng thái tài khoản
    if (existingUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị tạm ngưng hoặc không hoạt động. Vui lòng liên hệ quản trị viên.');
    }

    // TODO: Add notification after fixing dependency injection
    this.logger.log(`Google login successful for user ${existingUser.id}`);

    const rolePayload = {
      id: existingUser.role.id,
      name: existingUser.role.name,
    };

    // Tạo JWT token
    const accessToken = this.jwtService.sign({
      email: existingUser.email,
      sub: existingUser.id,
      role: rolePayload,
      subscription: subscription?.id,
    });

    return { user: existingUser, access_token_jwt: accessToken };
  }
}