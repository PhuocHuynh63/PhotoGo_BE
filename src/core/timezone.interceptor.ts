import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.transformTimestamps(data);
      }),
    );
  }

  private transformTimestamps(data: any): any {
    if (!data) return data;

    // Nếu là array
    if (Array.isArray(data)) {
      return data.map(item => this.transformTimestamps(item));
    }

    // Nếu là object
    if (typeof data === 'object') {
      const transformed = { ...data };
      
      for (const [key, value] of Object.entries(transformed)) {
        if (value instanceof Date) {
          // Chuyển đổi Date sang múi giờ Việt Nam
          transformed[key] = this.convertToVietnamTime(value);
        } else if (typeof value === 'object' && value !== null) {
          // Đệ quy cho nested objects
          transformed[key] = this.transformTimestamps(value);
        }
      }
      
      return transformed;
    }

    return data;
  }

  private convertToVietnamTime(date: Date): string {
    // Chuyển đổi sang múi giờ Việt Nam (UTC+7)
    const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    
    // Format theo định dạng ISO nhưng với múi giờ Việt Nam
    return vietnamTime.toISOString().replace('Z', '+07:00');
  }
} 