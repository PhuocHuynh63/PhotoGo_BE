export enum BookingStatus {
  PENDING = 'chờ xử lý',
  CONFIRMED = 'đã xác nhận',
  CANCELLED = 'đã hủy',
  COMPLETED = 'đã hoàn thành',
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

export enum InvoiceStatus {
  PENDING = 'chờ thanh toán',
  PAID = 'đã thanh toán',
  CANCELLED = 'đã hủy',
  REFUNDED = 'đã hoàn tiền',
}

export enum PaymentMethod {
  CARD = 'thẻ',
  BANK_TRANSFER = 'chuyển khoản ngân hàng',
  E_WALLET = 'ví điện tử',
  PAYOS = 'PAYOS',
}

export enum PaymentStatus {
  PENDING = 'chờ xử lý',
  COMPLETED = 'đã hoàn thành',
  FAILED = 'thất bại',
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
