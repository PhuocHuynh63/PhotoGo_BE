import { Controller, Get, Query } from "@nestjs/common";
import { MailService } from "./mail.service";
import { ApiQuery } from "@nestjs/swagger";
import { Public } from "src/decorator/custom";

@Controller('mail')
export class MailController {
    constructor(
        private readonly mailService: MailService,
    ) { }

    @Get('send-otp')
    @Public()
    @ApiQuery({ name: 'email', required: true, type: String })
    async sendOtp(@Query('email') email: string) {
        return await this.mailService.generateAndSendOtp(email);
    }

}

