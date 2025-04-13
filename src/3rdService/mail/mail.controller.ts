import { Controller, Get, Post, Query } from "@nestjs/common";
import { MailService } from "./mail.service";
import { ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Public, ResponseMessage } from "src/decorator/custom";

@Controller('mail')
@ApiBearerAuth('access-token')
export class MailController {
    constructor(
        private readonly mailService: MailService,
    ) { }

    @Public()
    @Post('send-otp')
    @ResponseMessage('Send otp successful')
    @ApiQuery({ name: 'email', required: true, type: String })
    async sendOtp(@Query('email') email: string) {
        const emailLower = email.toLowerCase();
        const template = 'register.hbs';
        return await this.mailService.generateAndSendOtp(emailLower, template);
    }

    @Public()
    @Post('verify-otp')
    @ResponseMessage('Verify successful')
    @ApiQuery({ name: 'otp', required: true, type: String })
    @ApiQuery({ name: 'email', required: true, type: String })
    async verifyOtpController(@Query('email') email: string, @Query('otp') otp: string) {
        return await this.mailService.verifyOtp(email, otp);
    }

    @Public()
    @Post('send-otp-reset-password')
    @ResponseMessage('Send otp reset successful')
    @ApiQuery({ name: 'email', required: true, type: String })
    async sendOtpResetPassword(@Query('email') email: string) {
        const emailLower = email.toLowerCase();
        const template = 'reset-password.hbs';
        return await this.mailService.generateAndSendOtp(emailLower, template);
    }
}

