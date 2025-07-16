export enum BookingStatus {
  PENDING = 'chờ xử lý',
  CONFIRMED = 'đã xác nhận',
  CANCELLED = 'đã hủy',
  COMPLETED = 'đã hoàn thành',
  PAID = 'đã thanh toán',
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
