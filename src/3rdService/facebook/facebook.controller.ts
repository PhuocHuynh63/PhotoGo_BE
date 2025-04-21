import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { FacebookAuthService } from './facebook.service';
import { Public } from 'src/decorator/custom';

@Controller('auth/facebook')
export class FacebookAuthController {
    constructor(private readonly facebookAuthService: FacebookAuthService) { }

    @Get()
    @Public()
    @UseGuards(AuthGuard('facebook'))
    async facebookLogin(): Promise<void> {
        // Redirect to Facebook for authentication
    }

    @Get('callback')
    @Public()
    @UseGuards(AuthGuard('facebook'))
    async facebookLoginCallback(@Req() req: any, @Res() res: Response): Promise<void> {
        const user = await this.facebookAuthService.validateUser(req.user);
        const token = await this.facebookAuthService.generateJwt(user);
        res.redirect(`http://localhost:3000?token=${token}`);
    }
}