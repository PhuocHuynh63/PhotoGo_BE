import { Controller, Post, Body, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Res, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ApiQuery } from '@nestjs/swagger';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Login success')
  handleLogin(@Body() loginDto: LoginAuthDto, @Request() req) {
    console.log('Login payload:', loginDto);
    return this.authService.login(req.user);
  }

  @Public()
  @Post('register')
  @ApiQuery({ name: 'email', required: true, type: String })
  @ResponseMessage('Register success')
  async register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Public()
  @Post('reset-password')
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiQuery({ name: 'passwordHash', required: true, type: String })
  @ResponseMessage('Reset password success')
  async resetPassword(@Query('email') email: string, @Query('email') passwordHash: string) {
    return this.authService.forgotPassword(email, passwordHash);
  }
}