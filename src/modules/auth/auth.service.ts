import { Injectable, BadRequestException, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { comparePasswordHelper, getInitials } from 'src/utils/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

import { UserService } from 'src/modules/users/user.service';
import { MailService } from 'src/3rdService/mail/mail.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';


@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) { }

  //#region Validate User
  async validateUser(email: string, password: string): Promise<any> {
    const emailLower = email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new NotFoundException('');
    }

    const isMatch = await comparePasswordHelper(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Xác thực không thành công');
    }
    await this.userService.updateLoginAt(user);

    return user;
  }
  //#endregion

  //#region Login
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, fullname: user.fullname, role: user.role, image: user.image };

    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        role: user.role,
      },
      access_token: this.jwtService.sign(payload, {
        expiresIn: '1d',
      }),
      refresh_token: this.jwtService.sign(payload, {
        expiresIn: '7d',
      }),
    };
  }
  //#endregion

  //#region Register
  async handleRegister(registerDto: CreateAuthDto) {
    const registerEmailLowerCase = registerDto.email.toLowerCase();

    // Verify OTP
    // const isOtpValid = await this.mailService.verifyOtp(registerEmailLowerCase, registerDto.otp);
    // if (!isOtpValid) {
    //   throw new UnauthorizedException('Sai mã xác thực');
    // }

    // Create user
    const user = await this.userService.create({
      ...registerDto,
      email: registerEmailLowerCase,
      avatarUrl: getInitials(registerDto.fullName),
      passwordHash: registerDto.passwordHash,
      fullName: registerDto.fullName,
      auth: 'local',
    });
    if (!user) {
      throw new ConflictException('Email đã tồn tại');
    }

    return user;
  }
  //#endregion

  //#region activeAccount
  async activeAccount(body: { email: string }) {
    return await this.userService.activeAccount(body);
  }
  //#endregion

  //#region forgotPassword
  async forgotPassword(email: string, passwordHash: string) {
    const emailLower = email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new NotFoundException('Ngươi dùng không tồn tại');
    }
    return await this.userService.resetPassword(user, passwordHash);
  }
  //#endregion
}