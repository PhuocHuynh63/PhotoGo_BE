export enum PaymentType {
  DEPOSIT = 'đặt cọc',
  RENEWAL = 'gia hạn',
  REMAINING = 'còn lại'
}

export enum PaymentStatus {
  PENDING = 'chờ xử lý',
  PAID = 'đã hoàn thành',
  FAILED = 'thất bại',
  REFUNDED = 'hoàn trả'
}

export enum InvoiceStatus {
  PENDING = 'chờ thanh toán',
  PARTIALLY_PAID = 'đã thanh toán một phần',
  PAID = 'đã thanh toán',
  CANCELLED = 'đã hủy'
}

export enum PaymentMethod {
  PAYOS = 'PAYOS'
}
