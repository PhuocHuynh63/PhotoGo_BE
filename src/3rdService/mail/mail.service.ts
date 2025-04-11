import { Inject, Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { RedisClientType } from 'redis';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, 
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<void> {
    const mailOptions = {
      from: '"No Reply" <no-reply@example.com>',
      to,
      subject,
      text,
      html,
    };

    await this.transporter.sendMail(mailOptions);

  }

  //#region sendOtpMail
  async sendOtpMail(to: string, otp: string): Promise<void> {
    const subject = 'Your OTP Code';
    const text = `Your OTP code is ${otp}`;
    const html = `<p>Your OTP code is <strong>${otp}</strong></p>`;

    await this.sendMail(to, subject, text, html);
  }
  //#endregion

  //#region generateAndSendOtp
  async generateAndSendOtp(email: string): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    await this.redisClient.set(email, otp, { EX: 30 }); // Store OTP in Redis with a 30s expiration
    await this.sendOtpMail(email, otp);
  }
  //#endregion

  //#region verifyOtp
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const storedOtp = await this.redisClient.get(email);
    if (storedOtp === otp) {
      await this.redisClient.del(email); // Delete OTP after successful verification
      return true;
    }
    return false;
  }
  //#endregion


}