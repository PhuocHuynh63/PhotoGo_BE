import { Injectable, BadRequestException } from '@nestjs/common';
import { PointService } from './point.service';
import { PointTransactionType } from 'src/constants/point.enum';
import { Point } from './entities/point.entity';
import { PointTransaction } from './entities/point-transaction.entity';

@Injectable()
export class PointHelperService {
  constructor(private readonly pointService: PointService) {}

  //#region Điểm danh hàng ngày
  async handleDailyCheckIn(
    userId: string,
    points: number,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.addPointsToUser(
      userId,
      points,
      PointTransactionType.EARN,
      `Điểm danh hàng ngày +${points} điểm`,
    );
  }
  //#endregion

  //#region Quy đổi voucher
  async handleVoucherRedemption(
    userId: string,
    points: number,
    voucherName: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.deductPointsFromUser(
      userId,
      points,
      PointTransactionType.REDEEM,
      `Quy đổi voucher: ${voucherName} -${points} điểm`,
    );
  }
  //#endregion

  //#region Điểm hết hạn
  async handlePointExpiration(
    userId: string,
    points: number,
    reason: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.deductPointsFromUser(
      userId,
      points,
      PointTransactionType.EXPIRE,
      `Điểm hết hạn: ${reason} -${points} điểm`,
    );
  }
  //#endregion

  //#region Thưởng từ đơn hàng
  async handleOrderReward(
    userId: string,
    points: number,
    orderId: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.addPointsToUser(
      userId,
      points,
      PointTransactionType.EARN,
      `Thưởng từ đơn hàng #${orderId} +${points} điểm`,
    );
  }
  //#endregion

  //#region Hoàn điểm khi hủy đơn hàng
  async handleOrderRefund(
    userId: string,
    points: number,
    orderId: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.addPointsToUser(
      userId,
      points,
      PointTransactionType.EARN,
      `Hoàn điểm từ đơn hàng #${orderId} +${points} điểm`,
    );
  }
  //#endregion

  //#region Trừ điểm khi đặt đơn hàng
  async handleOrderPayment(
    userId: string,
    points: number,
    orderId: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.deductPointsFromUser(
      userId,
      points,
      PointTransactionType.REDEEM,
      `Thanh toán đơn hàng #${orderId} -${points} điểm`,
    );
  }
  //#endregion

  //#region Thưởng từ review
  async handleReviewReward(
    userId: string,
    points: number,
    reviewId: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.addPointsToUser(
      userId,
      points,
      PointTransactionType.EARN,
      `Thưởng từ đánh giá #${reviewId} +${points} điểm`,
    );
  }
  //#endregion

  //#region Thưởng từ giới thiệu
  async handleReferralReward(
    userId: string,
    points: number,
    referredUserId: string,
  ): Promise<{ point: Point; transaction: PointTransaction }> {
    return this.pointService.addPointsToUser(
      userId,
      points,
      PointTransactionType.EARN,
      `Thưởng giới thiệu người dùng #${referredUserId} +${points} điểm`,
    );
  }
  //#endregion

  //#region Kiểm tra balance
  async checkUserBalance(
    userId: string,
    requiredPoints: number,
  ): Promise<boolean> {
    try {
      const userPoint = await this.pointService.findMyPoints(userId);
      return userPoint.balance >= requiredPoints;
    } catch (error) {
      return false;
    }
  }
  //#endregion

  //#region Lấy balance
  async getUserBalance(userId: string): Promise<number> {
    try {
      const userPoint = await this.pointService.findMyPoints(userId);
      return userPoint.balance;
    } catch (error) {
      return 0;
    }
  }
  //#endregion
}
