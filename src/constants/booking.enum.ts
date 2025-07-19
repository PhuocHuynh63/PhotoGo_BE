export enum BookingStatus {
  NOT_PAID = 'chưa thanh toán',
  PAID = 'đã thanh toán',
  PENDING = 'chờ xác nhận',
  CONFIRMED = 'đã xác nhận',
  PROGRESSING = 'đang thực hiện',
  COMPLETED = 'đã hoàn thành',
  CANCELLED = 'đã hủy',
  CANCELLED_TIMEOUT = 'đã hủy - quá hạn thanh toán',
  CANCELLED_USER = 'đã hủy - người dùng tự hủy',
  CANCELLED_VENDOR = 'đã hủy - vendor từ chối',
}

export enum BookingScheduleStatus {
  SCHEDULED = 'đã lên lịch',
  POSTPONED = 'đã hoãn',
  COMPLETED = 'đã hoàn thành',
  CANCELLED = 'đã hủy',
  CONTINUED = 'đã tiếp tục',
}

export enum BookingSourceType {
  DIRECT = 'trực tiếp',
  CAMPAIGN = 'chiến dịch',
  REFERRAL = 'giới thiệu',
  FEATURED = 'nổi bật',
  PROMOTION = 'khuyến mãi',
  OTHER = 'khác',
}

export enum BookingDepositType {
  PERCENTAGE = 'phần trăm',
}

export enum BookingType {
  SINGLE_DAY = 'một ngày',
  MULTI_DAY = 'nhiều ngày',
}

export enum RefundStatus {
  PENDING = 'chờ xử lý',
  APPROVED = 'đã chấp nhận',
  REJECTED = 'bị từ chối',
  COMPLETED = 'đã hoàn thành',
}

export enum DisputeStatus {
  OPEN = 'mở',
  IN_PROGRESS = 'đang xử lý',
  RESOLVED = 'đã giải quyết',
  CLOSED = 'đã đóng',
}
