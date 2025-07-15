export enum PaymentType {
  DEPOSIT = 'đặt cọc',
  RENEWAL = 'gia hạn',
  REMAINING = 'còn lại',
  FULL_PAYMENT = 'thanh toán đầy đủ'
}

export enum PaymentStatus {
  PENDING = 'chờ xử lý',
  PAID = 'đã hoàn thành',
  FAILED = 'thất bại',
  REFUNDED = 'hoàn trả',
  REFUND_PENDING = 'chờ hoàn tiền',
  REFUND_PROCESSING = 'đang xử lý hoàn tiền'
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

export enum PayerType {
  CUSTOMER = 'khách hàng',
  VENDOR = 'nhà cung cấp'
}
