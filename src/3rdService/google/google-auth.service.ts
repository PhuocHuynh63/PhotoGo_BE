import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../modules/users/user.service';
import { Role } from '../../modules/roles/entities/role.entity';
import { RoleService } from 'src/modules/roles/role.service';
import { UserStatus } from 'src/constants/user.enum';
import { Logger } from '@nestjs/common';

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
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

    // TODO: Add notification after fixing dependency injection
    this.logger.log(`Google login successful for user ${existingUser.id}`);

    // Tạo JWT token
    const accessToken = this.jwtService.sign({
      email: existingUser.email,
      sub: existingUser.id,
      role: existingUser.role, // Include role name in the token
    });

    return { user: existingUser, access_token_jwt: accessToken };
  }
}