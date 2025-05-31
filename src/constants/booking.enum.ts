export enum BookingStatus {
  PENDING = 'Chờ xử lý',
  CONFIRMED = 'Đã xác nhận',
  CANCELLED = 'Đã hủy',
  COMPLETED = 'Đã hoàn thành',
}

export enum BookingSourceType {
  DIRECT = 'Trực tiếp',
  CAMPAIGN = 'Chiến dịch',
  REFERRAL = 'Giới thiệu',
  FEATURED = 'Nổi bật',
  PROMOTION = 'Khuyến mãi',
  OTHER = 'Khác',
}

export enum BookingDepositType {
  PERCENTAGE = 'Phần trăm',
}

export enum InvoiceStatus {
  PENDING = 'Chờ thanh toán',
  PAID = 'Đã thanh toán',
  CANCELLED = 'Đã hủy',
  REFUNDED = 'Đã hoàn tiền',
}

export enum PaymentMethod {
  CARD = 'Thẻ',
  BANK_TRANSFER = 'Chuyển khoản ngân hàng',
  E_WALLET = 'Ví điện tử',
  PAYOS = 'PAYOS',
}

export enum PaymentStatus {
  PENDING = 'Chờ xử lý',
  COMPLETED = 'Đã hoàn thành',
  FAILED = 'Thất bại',
  REFUNDED = 'Đã hoàn tiền',
}

export enum RefundStatus {
  PENDING = 'Chờ xử lý',
  APPROVED = 'Đã chấp nhận',
  REJECTED = 'Bị từ chối',
  COMPLETED = 'Đã hoàn thành',
}

export enum DisputeStatus {
  OPEN = 'Mở',
  IN_PROGRESS = 'Đang xử lý',
  RESOLVED = 'Đã giải quyết',
  CLOSED = 'Đã đóng',
}
