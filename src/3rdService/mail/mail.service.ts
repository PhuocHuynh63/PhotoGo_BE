import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { RedisClientType } from 'redis';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) { }


  async sendMail(to: string, subject: string, template: string, context: any): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  async sendOtpMail(to: string, otp: string): Promise<void> {
    const subject = 'Your OTP Code ' + otp;
    const template = 'register.hbs'; // Tên file template (otp.hbs)
    const context = { otp };

    await this.sendMail(to, subject, template, context);
  }


  async generateAndSendOtp(email: string): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo OTP 6 chữ số
    try {
      await this.redisClient.set(email, otp, { EX: 300 }); // Lưu OTP vào Redis với thời gian hết hạn 5 phút
      await this.sendOtpMail(email, otp);
      this.logger.log(`OTP sent to ${email}: ${otp}`);
    } catch (error) {
      this.logger.error(`Failed to generate or send OTP to ${email}: ${error.message}`);
      throw error;
    }
  }


  async verifyOtp(email: string, otp: string): Promise<boolean> {
    try {
      const storedOtp = await this.redisClient.get(email);
      if (storedOtp === otp) {
        await this.redisClient.del(email); // Xóa OTP sau khi xác minh thành công
        this.logger.log(`OTP verified for ${email}`);
        return true;
      }
      this.logger.warn(`Invalid OTP for ${email}`);
      return false;
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}: ${error.message}`);
      throw error;
    }
  }
}