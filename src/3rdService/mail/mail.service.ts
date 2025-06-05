import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Redis } from 'ioredis'; // Dùng Redis từ ioredis thay vì RedisClientType
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly kafkaService: KafkaService,
  ) { }

  async onModuleInit() {
    // Subscribe to Kafka topics
    await this.kafkaService.subscribe('booking-requests', this.handleBookingCreated.bind(this));
    await this.kafkaService.subscribe('payment-processing', this.handlePaymentProcessed.bind(this));
  }

  private async handleBookingCreated(message: any) {
    try {
      if (message.type === 'BOOKING_CREATED') {
        const { data } = message;
        await this.sendBookingConfirmation(data);
      }
    } catch (error) {
      this.logger.error('Error handling booking created event:', error);
    }
  }

  private async handlePaymentProcessed(message: any) {
    try {
      if (message.type === 'PAYMENT_SUCCESS') {
        const { data } = message;
        await this.sendInvoice(data);
      }
    } catch (error) {
      this.logger.error('Error handling payment processed event:', error);
    }
  }

  async sendBookingConfirmation(data: any) {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Xác nhận đặt lịch thành công - PhotoGo',
        template: 'booking-confirmation',
        context: {
          fullName: data.fullName,
          bookingId: data.bookingId,
          date: data.date,
          time: data.time,
          serviceName: data.serviceName,
          location: data.location,
          depositAmount: data.depositAmount,
        },
      });
      this.logger.log(`Booking confirmation email sent to ${data.email}`);
    } catch (error) {
      this.logger.error('Error sending booking confirmation email:', error);
      throw error;
    }
  }

  async sendInvoice(data: any) {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Hóa đơn thanh toán - PhotoGo',
        template: 'invoice',
        context: {
          fullName: data.fullName,
          invoiceId: data.invoiceId,
          bookingId: data.bookingId,
          serviceName: data.serviceName,
          date: data.date,
          time: data.time,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          voucherCode: data.voucherCode,
          discountAmount: data.discountAmount,
          issuedAt: data.issuedAt,
        },
      });
      this.logger.log(`Invoice email sent to ${data.email}`);
    } catch (error) {
      this.logger.error('Error sending invoice email:', error);
      throw error;
    }
  }

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

  async sendOtpMail(to: string, otp: string, template: string, content: string, body: string): Promise<void> {
    const subject = 'Mã OTP Code của bạn là ' + otp;
    const context = { otp, content, body };
    await this.sendMail(to, subject, template, context);
  }


  async generateAndSendOtp(email: string, template: string, content: string, body: string): Promise<void> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo OTP 6 chữ số
    if (await this.redisClient.exists(email)) {
      await this.redisClient.del(email); // Xóa OTP cũ nếu có
    }
    await this.redisClient.set(email, otp, 'EX', 300); // Lưu OTP vào Redis với thời gian hết hạn 5 phút
    await this.sendOtpMail(email, otp, template, content, body);
    this.logger.log(`OTP sent to ${email}: ${otp}`);
  }

  async verifyOtpStrict(email: string, otp: string): Promise<boolean> {
    try {
      const storedOtp = await this.redisClient.get(email);
      if (storedOtp === otp) {
        this.logger.log(`OTP verified for ${email}`);
        return true;
      }

      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}: ${error.message}`);
      throw error;
    }
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    try {
      const storedOtp = await this.redisClient.get(email);
      if (storedOtp === otp) {
        this.logger.log(`OTP verified for ${email}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${email}: ${error.message}`);
      throw error;
    }
  }
}