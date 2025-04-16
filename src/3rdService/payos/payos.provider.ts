import PayOS from '@payos/node';
import { ConfigService } from '@nestjs/config';

export const payosProvider = {
  provide: 'PAYOS_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new PayOS(
      configService.get<string>('PAYOS_CLIENT_ID'),
      configService.get<string>('PAYOS_API_KEY'),
      configService.get<string>('PAYOS_CHECKSUM_KEY')
    );
  },
  inject: [ConfigService],
};
