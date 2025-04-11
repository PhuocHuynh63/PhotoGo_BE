import { Injectable, BadRequestException, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { comparePasswordHelper } from 'src/utils/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { UserService } from 'src/modules/users/user.service';
import { MailService } from 'src/3rdService/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const emailLower = email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await comparePasswordHelper(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, fullname: user.fullname, role: user.role, image: user.image };
    return {
      user: {
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        role: user.role,
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  async handleRegister(registerDto: CreateAuthDto) {
    try {
      const registerEmailLowerCase = registerDto.email.toLowerCase();

      // Verify OTP
      const isOtpValid = await this.mailService.verifyOtp(registerEmailLowerCase, registerDto.otp);
      if (!isOtpValid) {
        throw new UnauthorizedException('Invalid OTP');
      }

      // Create user
      return await this.userService.create({
        ...registerDto,
        email: registerEmailLowerCase,
        passwordHash: registerDto.passwordHash,
        fullName: registerDto.fullName,
        auth: 'local',
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }

  async activeAccount(body: { email: string }) {
    return await this.userService.activeAccount(body);
  }

  async resetPassword(data: UpdateAuthDto) {
    return await this.userService.resetPassword(data);
  }
}