export enum VendorStatus {
  ACTIVE = 'Hoạt động',
  INACTIVE = 'Không hoạt động',
  SUSPENDED = 'Tạm ngưng',
}

export enum VendorManagerRole {
  OWNER = 'Chủ sở hữu',
  MANAGER = 'Quản lý',
  STAFF = 'Nhân viên',
}

export enum VendorSortField {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  NAME = 'name',
  PRICE = 'price',
  RATING = 'rating',
  SUBSCRIPTION_COUNT = 'subscription_count'
}