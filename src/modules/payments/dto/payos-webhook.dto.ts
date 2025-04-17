import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PayOSWebhookDto {

  @IsString()
  @ApiProperty({ example: 'completed' })
  status: string;

  @IsString()
  @ApiProperty({ example: '2023-10-01T12:00:00Z' })
  transactionId: string;
}
