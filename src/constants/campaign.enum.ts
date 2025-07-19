export enum CampaignType {
  WELCOME = 'chào bạn mới',
  LOYALTY = 'thưởng thức',
  PROMOTION = 'khuyến mãi',
}

export enum CampaignStatus {
  ACTIVE = 1,
  INACTIVE = 0,
}

// Campaign names constants
export const CAMPAIGN_NAMES = {
  WELCOME: 'Chào Bạn Mới',
} as const;

// Voucher codes constants
export const VOUCHER_CODES = {
  WELCOME: 'CHAOBANMOI',
} as const; 