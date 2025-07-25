import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth/google')
@ApiBearerAuth('access-token')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) { }

  @Get()
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This will redirect to Google login page
  }

  @Get('callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ResponseMessage('Google login success')
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user;

    const { user: userData, access_token_jwt } = await this.googleAuthService.loginOrSignup(user);

    // Kiểm tra xem yêu cầu đến từ ứng dụng di động hay không
    const isMobileApp = req.headers['x-requested-with'] === 'com.mycorp.myapp';

    if (isMobileApp) {
      // Trả về dữ liệu JSON cho ứng dụng di động kèm theo URL chuyển hướng
      const redirectUrl = `myapp://HomeScreen? user=${encodeURIComponent(JSON.stringify(user))}&token=${access_token_jwt}`;
      return res.json({
        message: 'Google login success',
        redirectUrl,
      });
    } else {
      // Chuyển hướng đến trang HomePage kèm theo dữ liệu
      // const redirectUrl = `https://billiards-score-app.vercel.app/HomePage?user=${encodeURIComponent(JSON.stringify(user))}&token=${access_token_jwt}`;
      // const redirectUrl = `http://localhost:3000?user=${encodeURIComponent(JSON.stringify(user))}&token=${access_token_jwt}`;
      // const redirectUrl = `http://localhost:3000/auth/login/google?user=${encodeURIComponent(JSON.stringify(userData))}&token=${access_token_jwt}`;
      const redirectUrl = `https://photogo.id.vn/auth/login/google?user=${encodeURIComponent(JSON.stringify(user))}&token=${access_token_jwt}`;
      return res.redirect(redirectUrl);
    }
  }
}