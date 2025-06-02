import { Injectable, BadRequestException, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { comparePasswordHelper, getInitials } from 'src/utils/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

import { UserService } from 'src/modules/users/user.service';
import { MailService } from 'src/3rdService/mail/mail.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { RestPasswordhDto } from './dto/rest-password.dto';
import { CartService } from 'src/modules/carts/cart.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly cartService: CartService,
  ) { }

  //#region Validate User
  async validateUser(email: string, password: string): Promise<any> {
    const emailLower = email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new BadRequestException('Tài khoản hoặc mật khẩu không chính xác');
    }

    const isMatch = await comparePasswordHelper(password, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Tài khoản hoặc mật khẩu không chính xác');
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

    // Check if email already exists
    const existingUser = await this.userService.checkDuplicateEmail(registerEmailLowerCase);

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Create user
    const user = await this.userService.create({
      ...registerDto,
      email: registerEmailLowerCase,
      avatarUrl: getInitials(registerDto.fullName),
      passwordHash: registerDto.passwordHash,
      fullName: registerDto.fullName,
      auth: 'local',
    });

    const template = 'otp';
    const content = 'Mã OTP của bạn là: ';
    const body = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.';

    // Send email
    this.mailService.generateAndSendOtp(registerEmailLowerCase, template, content, body);
    // create cart for user
    await this.cartService.createCart(user.id);
    return user;
  }
  //#endregion

  //#region activeAccount
  async activeAccount(email: string, otp: string) {
    const verifyOtp = await this.mailService.verifyOtp(email, otp);
    if (!verifyOtp) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }
    const emailLower = email.toLowerCase();
    return await this.userService.activeAccount(emailLower)
  }
  //#endregion

  //#region forgotPassword
  async resetPassword(body: RestPasswordhDto) {
    const emailLower = body.email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new NotFoundException('Email không tồn tại');
    }
    await this.mailService.verifyOtp(emailLower, body.otp);

    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    if (body.password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    return await this.userService.resetPassword(user, body.password);
  }
  //#endregion
}