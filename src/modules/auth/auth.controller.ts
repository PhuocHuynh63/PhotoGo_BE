import { Controller, Post, Body, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Res, Query, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RestPasswordhDto } from './dto/rest-password.dto';

@Controller('auth')
@ApiBearerAuth('access-token')
export class AuthController {
  constructor(private readonly authService: AuthService,
  ) { }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Đăng nhập thành công')
  handleLogin(@Body() loginDto: LoginAuthDto, @Request() req) {
    console.log('Login payload:', loginDto);
    return this.authService.login(req.user);
  }

  @Public()
  @Post('register')
  @ResponseMessage('Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản')
  async register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Public()
  @Post('reset-password')
  @ResponseMessage('Đặt lại mật khẩu thành công')
  async resetPassword(@Body() body: RestPasswordhDto) {
    return this.authService.forgotPassword(body);
  }

  @Public()
  @Post('activate')
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiQuery({ name: 'otp', required: true, type: String })
  @ResponseMessage('Kích hoạt tài khoản thành công')
  async activateAccount(@Query('email') email: string, @Query('otp') otp: string) {
    return this.authService.activeAccount(email, otp);
  }


}