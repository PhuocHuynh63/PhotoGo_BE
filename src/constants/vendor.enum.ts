export enum VendorStatus {
  ACTIVE = 'hoạt động',
  INACTIVE = 'không hoạt động',
  SUSPENDED = 'tạm ngưng',
}

export enum VendorManagerRole {
  OWNER = 'chủ sở hữu',
  MANAGER = 'quản lý',
  STAFF = 'nhân viên',
}

export enum VendorSortField {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  NAME = 'name',
  PRICE = 'price',
  RATING = 'rating',
  SUBSCRIPTION_COUNT = 'subscription_count',
  DISTANCE = 'distance'
}