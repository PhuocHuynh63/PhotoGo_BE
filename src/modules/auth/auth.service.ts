import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { comparePasswordHelper, hashPasswordHelper } from 'src/utils/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { UserService } from 'src/modules/user/user.service';
// import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    // private readonly mailService: MailService,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const emailLower = email.toLowerCase();
    const user = await this.userService.findEmailAndPassword(emailLower, password);
    if (!user) {
      return null;
    }

    const isMatch = await comparePasswordHelper(password, user.password);
    if (!isMatch) {
      return undefined;
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
      },
      access_token: this.jwtService.sign(payload),
    };
  }

  // async handleRegister(registerDto: CreateAuthDto) {
  //   try {
  //     const registerEmailLowerCase = registerDto.email.toLowerCase();
  //     const otp = this.mailService.verifyOtp(registerEmailLowerCase, registerDto.otp);
  //     if (!otp) {
  //       throw new UnauthorizedException('Invalid OTP');
  //     }
  //     return await this.userService.createUser({
  //       ...registerDto,
  //       email: registerEmailLowerCase,
  //     });
  //   } catch (error) {
  //     if (error.code === 11000) {
  //       throw new ConflictException('Email already exists');
  //     }
  //     throw error;
  //   }
  // }

  // async checkActiveCode(id: string) {
  //   return await this.userService.checkActiveCode(id);
  // }

  // async activeAccount(body: { email: string }) {
  //   return await this.userService.activeAccount(body);
  // }

  // async resetPassword(data: UpdateAuthDto) {
  //   return await this.userService.resetPassword(data);
  // }

  // Add more methods as needed
}