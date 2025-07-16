/**
 * Ví dụ các loại campaign có thể tạo với Campaign Engine
 */

// 1. Chiến dịch chào mừng người mới
export const welcomeCampaign = {
  name: 'Chào mừng người mới',
  description: 'Tặng voucher 10% cho user mới đăng ký',
  type: 'welcome',
  status: 'active',
  isActive: true,
  triggers: [
    {
      triggerType: 'user_registered',
      isActive: true,
    },
  ],
  conditions: [
    {
      conditionType: 'is_first_purchase',
      conditionConfig: {},
      priority: 1,
      isActive: true,
    },
  ],
  actions: [
    {
      actionType: 'send_voucher',
      actionConfig: {
        voucherCode: 'WELCOME10',
        discountAmount: 10,
        discountType: 'percentage',
        expiryDays: 30,
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'send_email',
      actionConfig: {
        template: 'welcome-email',
        subject: 'Chào mừng bạn đến với PhotoGo!',
        data: {
          discountCode: 'WELCOME10',
          discountAmount: 10,
        },
      },
      priority: 2,
      isActive: true,
    },
  ],
};

// 2. Chiến dịch sinh nhật
export const birthdayCampaign = {
  name: 'Sinh nhật vui vẻ',
  description: 'Tặng voucher 20% vào ngày sinh nhật',
  type: 'birthday',
  status: 'active',
  isActive: true,
  triggers: [
    {
      triggerType: 'user_birthday',
      isActive: true,
    },
  ],
  conditions: [
    {
      conditionType: 'user_registration_date_after',
      conditionConfig: {
        date: '2023-01-01',
      },
      priority: 1,
      isActive: true,
    },
  ],
  actions: [
    {
      actionType: 'send_voucher',
      actionConfig: {
        voucherCode: 'BIRTHDAY20',
        discountAmount: 20,
        discountType: 'percentage',
        expiryDays: 7,
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'send_notification',
      actionConfig: {
        title: 'Sinh nhật vui vẻ! 🎉',
        message: 'Bạn có voucher 20% giảm giá đang chờ!',
        type: 'birthday',
      },
      priority: 2,
      isActive: true,
    },
  ],
};

// 3. Chiến dịch khách hàng VIP
export const vipCampaign = {
  name: 'Khách hàng VIP',
  description: 'Ưu đãi đặc biệt cho khách hàng chi tiêu cao',
  type: 'custom',
  status: 'active',
  isActive: true,
  triggers: [
    {
      triggerType: 'total_spent',
      isActive: true,
    },
  ],
  conditions: [
    {
      conditionType: 'total_spent_greater_than',
      conditionConfig: {
        amount: 1000000, // 1 triệu VND
      },
      priority: 1,
      isActive: true,
    },
    {
      conditionType: 'user_purchase_count_greater_than',
      conditionConfig: {
        count: 5,
      },
      priority: 2,
      isActive: true,
    },
  ],
  actions: [
    {
      actionType: 'add_points',
      actionConfig: {
        points: 1000,
        reason: 'VIP customer bonus',
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'send_voucher',
      actionConfig: {
        voucherCode: 'VIP25',
        discountAmount: 25,
        discountType: 'percentage',
        expiryDays: 60,
      },
      priority: 2,
      isActive: true,
    },
    {
      actionType: 'free_shipping',
      actionConfig: {
        shippingMethod: 'express',
      },
      priority: 3,
      isActive: true,
    },
  ],
};

// 4. Chiến dịch kích hoạt lại khách hàng
export const reengagementCampaign = {
  name: 'Kích hoạt lại khách hàng',
  description: 'Ưu đãi cho khách hàng không mua hàng trong 30 ngày',
  type: 'custom',
  status: 'active',
  isActive: true,
  triggers: [
    {
      triggerType: 'custom_event',
      isActive: true,
    },
  ],
  conditions: [
    {
      conditionType: 'user_has_not_purchased_in_days',
      conditionConfig: {
        days: 30,
      },
      priority: 1,
      isActive: true,
    },
  ],
  actions: [
    {
      actionType: 'send_voucher',
      actionConfig: {
        voucherCode: 'COMEBACK15',
        discountAmount: 15,
        discountType: 'percentage',
        expiryDays: 14,
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'send_email',
      actionConfig: {
        template: 'reengagement-email',
        subject: 'Chúng tôi nhớ bạn!',
        data: {
          discountCode: 'COMEBACK15',
          daysInactive: 30,
        },
      },
      priority: 2,
      isActive: true,
    },
  ],
};

// 5. Chiến dịch ngày lễ
export const holidayCampaign = {
  name: 'Ưu đãi ngày lễ',
  description: 'Giảm giá đặc biệt trong dịp lễ',
  type: 'holiday',
  status: 'active',
  isActive: true,
  startDate: '2024-12-20',
  endDate: '2024-12-25',
  triggers: [
    {
      triggerType: 'holiday_event',
      isActive: true,
    },
  ],
  conditions: [
    {
      conditionType: 'user_registration_date_after',
      conditionConfig: {
        date: '2023-01-01',
      },
      priority: 1,
      isActive: true,
    },
  ],
  actions: [
    {
      actionType: 'send_voucher',
      actionConfig: {
        voucherCode: 'HOLIDAY30',
        discountAmount: 30,
        discountType: 'percentage',
        expiryDays: 10,
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'send_notification',
      actionConfig: {
        title: '🎄 Ưu đãi Giáng sinh!',
        message: 'Giảm 30% cho tất cả dịch vụ!',
        type: 'holiday',
      },
      priority: 2,
      isActive: true,
    },
  ],
};

// 6. Chiến dịch mua hàng lần đầu
export const firstPurchaseCampaign = {
  name: 'Mua hàng lần đầu',
  description: 'Ưu đãi đặc biệt cho lần mua hàng đầu tiên',
  type: 'purchase',
  status: 'active',
  isActive: true,
  triggers: [
    {
      triggerType: 'first_purchase',
      isActive: true,
    },
  ],
  conditions: [], // Không cần condition vì đã có trigger first_purchase
  actions: [
    {
      actionType: 'apply_discount',
      actionConfig: {
        discountAmount: 50,
        discountType: 'percentage',
        maxDiscount: 100000, // Tối đa 100k
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'add_points',
      actionConfig: {
        points: 500,
        reason: 'First purchase bonus',
      },
      priority: 2,
      isActive: true,
    },
    {
      actionType: 'send_email',
      actionConfig: {
        template: 'first-purchase-email',
        subject: 'Cảm ơn bạn đã mua hàng lần đầu!',
        data: {
          pointsEarned: 500,
        },
      },
      priority: 3,
      isActive: true,
    },
  ],
};

// 7. Chiến dịch theo độ tuổi
export const ageBasedCampaign = {
  name: 'Ưu đãi theo độ tuổi',
  description: 'Ưu đãi đặc biệt cho khách hàng trẻ',
  type: 'custom',
  status: 'active',
  isActive: true,
  triggers: [
    {
      triggerType: 'user_registered',
      isActive: true,
    },
  ],
  conditions: [
    {
      conditionType: 'user_age_between',
      conditionConfig: {
        minAge: 18,
        maxAge: 25,
      },
      priority: 1,
      isActive: true,
    },
  ],
  actions: [
    {
      actionType: 'send_voucher',
      actionConfig: {
        voucherCode: 'YOUNG20',
        discountAmount: 20,
        discountType: 'percentage',
        expiryDays: 45,
      },
      priority: 1,
      isActive: true,
    },
    {
      actionType: 'send_notification',
      actionConfig: {
        title: 'Ưu đãi đặc biệt cho bạn!',
        message: 'Giảm 20% cho khách hàng trẻ!',
        type: 'age_based',
      },
      priority: 2,
      isActive: true,
    },
  ],
};

// Export tất cả examples
export const campaignExamples = {
  welcomeCampaign,
  birthdayCampaign,
  vipCampaign,
  reengagementCampaign,
  holidayCampaign,
  firstPurchaseCampaign,
  ageBasedCampaign,
}; 