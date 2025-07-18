export enum SubscriptionStatus {
  ACTIVE = 'hoạt động',
  CANCELED = 'đã hủy',
  EXPIRED = 'hết hạn'
}

export enum BillingCycle {
  MONTHLY = 'hàng tháng',
  YEARLY = 'hàng năm'
}

export enum SubscriptionHistoryAction {
  CREATED = 'tạo',
  RENEWED = 'gia hạn',
  CANCELLED = 'hủy',
  EXPIRED = 'hết hạn',
  ACTIVATED = 'kích hoạt',
  PAYMENT_SUCCESS = 'thanh toán thành công',
  PAYMENT_FAILED = 'thanh toán thất bại',
  PAYMENT_CANCELLED = 'hủy thanh toán',
}

export enum SubscriptionInvoiceStatus {
  PENDING = 'đang chờ thanh toán',
  PAID = 'đã thanh toán',
  CANCELED = 'đã hủy',
}

export enum PlanType {
  USER = 'người dùng',
  VENDOR = 'nhà cung cấp',
}