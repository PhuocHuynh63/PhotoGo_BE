import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class PayOSService {
  private readonly apiKey: string;
  private readonly checksumKey: string;
  private readonly clientId: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('PAYOS_API_KEY');
    this.checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');
    this.clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    this.baseUrl = 'https://api-merchant.payos.vn'; // hoặc sandbox nếu bạn test
  }

  async createPaymentLink(data: {
    orderCode: number;
    amount: number;
    description: string;
    cancelUrl: string;
    returnUrl: string;
  }) {
    const body = {
      orderCode: data.orderCode,
      amount: data.amount,
      description: data.description,
      cancelUrl: 'https://photogo.id.vn/payment/error',
      returnUrl: 'https://photogo.id.vn/payment/successful',
    };

    const signature = this.generateSignature(body);

    const payload = {
      ...body,
      signature,
    };

    const res = await this.httpService.axiosRef.post(
      `${this.baseUrl}/v2/payment-requests`,
      payload,
      {
        headers: {
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey,
        },
      },
    );

    return res.data;
  }

  generateSignature(payload: any): string {
    const rawData = JSON.stringify(payload);
    return createHmac('sha256', this.checksumKey)
      .update(rawData)
      .digest('hex');
  }

  verifySignature(payload: any, signature: string): boolean {
    const rawData = JSON.stringify(payload);
    const expected = createHmac('sha256', this.checksumKey)
      .update(rawData)
      .digest('hex');
    return expected === signature;
  }

  async refundPayment(paymentId: string, data: { amount: number; description: string }) {
    const body = {
      amount: data.amount,
      reason: data.description, // PayOS gọi là "reason", không phải "description"
    };
  
    try {
      const res = await this.httpService.axiosRef.post(
        `https://api.payos.money/v1/payment/payments/${paymentId}/refund`,
        body,
        {
          headers: {
            'x-client-id': this.clientId,
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
  
      return {
        amount: res.data.amount,
        date: res.data.date,
      };
    } catch (error) {
      throw new Error(error?.response?.data?.message || 'Failed to process refund with PayOS');
    }
  }  
}
