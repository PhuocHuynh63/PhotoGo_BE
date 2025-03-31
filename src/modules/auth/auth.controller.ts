import { Controller, Post, Body, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserRoles } from 'src/constants/user.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @Public()
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
    if (registerDto.role === UserRoles.ADMIN) {
      throw new BadRequestException('Cannot register as ADMIN');
    }
    // return this.authService.handleRegister(registerDto);
  }
}