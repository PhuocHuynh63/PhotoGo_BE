import { Controller, Post, Body, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Res, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ResetPasswordDto } from '../users/dto/rest-password.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Login success')
  handleLogin(
    @Body() loginDto: LoginAuthDto,
    @Request() req
  ) {
    console.log('Login payload:', loginDto);
    return this.authService.login(req.user);
  }

  @Post('register')
  @Public()
  async register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Post('reset-password')
  @Public()
  async resetPassword(@Query()email: string, @Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(email, resetPasswordDto);
  }
}