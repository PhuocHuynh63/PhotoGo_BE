import { Injectable, BadRequestException } from '@nestjs/common';
import { PointHelperService } from './point-helper.service';

@Injectable()
export class VoucherPointExampleService {
  constructor(private readonly pointHelperService: PointHelperService) {}

  //#region Quy đổi voucher bằng điểm
  async redeemVoucherWithPoints(userId: string, voucherId: string, voucherName: string, requiredPoints: number): Promise<any> {
    try {
      // Kiểm tra balance trước
      const hasEnoughPoints = await this.pointHelperService.checkUserBalance(userId, requiredPoints);
      if (!hasEnoughPoints) {
        throw new BadRequestException(`Không đủ điểm để quy đổi voucher. Cần: ${requiredPoints} điểm`);
      }

      // Trừ điểm và tạo transaction
      const result = await this.pointHelperService.handleVoucherRedemption(
        userId,
        requiredPoints,
        voucherName
      );

      // Logic xử lý voucher khác...
      // Ví dụ: tạo voucher record, gửi email, etc.

      return {
        success: true,
        message: `Quy đổi voucher ${voucherName} thành công`,
        remainingPoints: result.point.balance,
        transactionId: result.transaction.id
      };

    } catch (error) {
      console.error('Error redeeming voucher:', error);
      throw error;
    }
  }
  //#endregion

  //#region Thưởng điểm khi mua voucher
  async rewardPointsForVoucherPurchase(userId: string, voucherId: string, rewardPoints: number): Promise<any> {
    try {
      // Cộng điểm thưởng
      const result = await this.pointHelperService.handleOrderReward(
        userId,
        rewardPoints,
        voucherId
      );

      return {
        success: true,
        message: `Nhận ${rewardPoints} điểm thưởng từ việc mua voucher`,
        totalPoints: result.point.balance,
        transactionId: result.transaction.id
      };

    } catch (error) {
      console.error('Error rewarding points for voucher purchase:', error);
      throw error;
    }
  }
  //#endregion
} 