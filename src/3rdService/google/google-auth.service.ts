import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GoogleAuthDto } from './dto/google-auth.dto';
import { UserRoles } from 'src/constants/user.enum';
import { User } from '../../modules/user/entities/user.entity';

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // Inject TypeORM repository
  ) {
    this.client = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  async loginOrSignup(user: any): Promise<{ user: User; access_token_jwt: string }> {
    const googleAuthDto: GoogleAuthDto = {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    // Tìm người dùng trong cơ sở dữ liệu
    let existingUser = await this.userRepository.findOneBy({ email: googleAuthDto.email });
    if (!existingUser) {
      // Nếu không tồn tại, tạo mới
      existingUser = this.userRepository.create({
        name: googleAuthDto.name,
        email: googleAuthDto.email,
        avatar: googleAuthDto.avatar,
        password: '', // Dummy empty password
        phone: '',
        role: UserRoles.USER,
        status: 'active',
        authProvider: 'google', // Explicitly set as google
      });
      await this.userRepository.save(existingUser);
    }

    // Tạo JWT token
    const accessToken = this.jwtService.sign({
      email: existingUser.email,
      sub: existingUser.id,
      role: existingUser.role,
    });

    return { user: existingUser, access_token_jwt: accessToken };
  }
}