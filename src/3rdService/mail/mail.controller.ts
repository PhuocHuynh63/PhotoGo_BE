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
    @ResponseMessage('Đã gửi mã OTP thành công')
    @ApiQuery({ name: 'email', required: true, type: String })
    async sendOtp(@Query('email') email: string) {
        const emailLower = email.toLowerCase();
        const template = 'otp';
        const content = 'Mã OTP của bạn là: ';
        const body = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.';
        return await this.mailService.generateAndSendOtp(emailLower, template, content, body);
    }

    @Public()
    @Post('verify-otp')
    @ResponseMessage('Xác thực mã OTP thành công')
    @ApiQuery({ name: 'otp', required: true, type: String })
    @ApiQuery({ name: 'email', required: true, type: String })
    async verifyOtpController(@Query('email') email: string, @Query('otp') otp: string) {
        return await this.mailService.verifyOtpStrict(email, otp);
    }
}

