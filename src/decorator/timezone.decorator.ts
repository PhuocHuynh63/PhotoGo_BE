import { Transform } from 'class-transformer';

export const VietnamTimezone = () => {
  return Transform(({ value }) => {
    if (!value) return value;
    
    if (value instanceof Date) {
      // Chuyển đổi sang múi giờ Việt Nam (UTC+7)
      const vietnamTime = new Date(value.getTime() + (7 * 60 * 60 * 1000));
      return vietnamTime.toISOString().replace('Z', '+07:00');
    }
    
    return value;
  });
}; 