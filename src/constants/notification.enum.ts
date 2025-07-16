export enum NotificationStatus {
    UNREAD = 'chưa đọc',
    READ = 'đã đọc',
}

export enum NotificationType {
    // General types
    INFO = 'thông tin',
    WARNING = 'cảnh báo',
    ERROR = 'lỗi',
    SUCCESS = 'thành công',

    // Business-specific types
    LOGIN = 'đăng nhập',
    DAILY_CHECKIN = 'điểm danh',
    POINT_DEDUCTION = 'trừ điểm',
    POINT_EARNED = 'cộng điểm',
    VOUCHER_EXCHANGE = 'đổi voucher',
    PAYMENT_TIMEOUT = 'hết hạn thanh toán',
    PAYMENT_SUCCESS = 'thanh toán thành công',
    SUBSCRIPTION_EXPIRY_REMINDER = 'nhắc nhở gia hạn',
    BOOKING_REMINDER = 'nhắc nhở chụp hình',
    BOOKING_CONFIRMED = 'xác nhận booking',
    BOOKING_CANCELLED = 'hủy booking',
}