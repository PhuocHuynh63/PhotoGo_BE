// This file contains the enum for voucher user status
export enum VoucherUserStatusEnum {
    AVAILABLE = 'có sẵn',
    USED = 'đã sử dụng',
    EXPIRED = 'hết hạn',
}

export enum VoucherStatusEnum {
    ACTIVE = 'hoạt động',
    INACTIVE = 'không hoạt động',
    EXPIRED = 'hết hạn',
}

export enum VoucherTypeDiscount {
    FIXED = 'cố định',
    PERCENTAGE = 'phần trăm',
}

export enum VoucherTypePoint {
    POINT = 'điểm',
    CAMPAIGN = 'chiến dịch',
    WHEEL_OF_FORTUNE = 'vòng quay may mắn',
}

export enum VoucherUserFromEnum {
    CAMPAIGN = 'chiến dịch',
    POINT_REDEEM = 'đổi điểm',
    WHEEL_OF_FORTUNE = 'vòng quay may mắn',
}