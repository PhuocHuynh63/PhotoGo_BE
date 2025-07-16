import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LuckyWheel, LuckyWheelStatus, LuckyWheelType } from './entities/lucky-wheel.entity';
import { LuckyWheelPrize, PrizeType } from './entities/lucky-wheel-prize.entity';
import { LuckyWheelSpin, SpinStatus } from './entities/lucky-wheel-spin.entity';
import { CreateLuckyWheelDto } from './dto/create-lucky-wheel.dto';
import { CreateLuckyWheelPrizeDto } from './dto/create-lucky-wheel-prize.dto';
import { SpinWheelDto, SpinResultDto, FindSpinHistoryDto } from './dto/spin-wheel.dto';
import { PointHelperService } from '../points/point-helper.service';
import { VoucherService } from '../vouchers/voucher.service';
import { PointTransactionType } from 'src/constants/point.enum';
import { VoucherUserStatusEnum, VoucherUserFromEnum } from 'src/constants/voucher.enum';

@Injectable()
export class LuckyWheelService {
    constructor(
        @InjectRepository(LuckyWheel)
        private readonly luckyWheelRepository: Repository<LuckyWheel>,
        @InjectRepository(LuckyWheelPrize)
        private readonly prizeRepository: Repository<LuckyWheelPrize>,
        @InjectRepository(LuckyWheelSpin)
        private readonly spinRepository: Repository<LuckyWheelSpin>,
        private readonly pointHelperService: PointHelperService,
        private readonly voucherService: VoucherService,
    ) { }

    //#region Wheel Management
    async createWheel(createWheelDto: CreateLuckyWheelDto): Promise<LuckyWheel> {
        // Validate dates
        if (createWheelDto.start_date && createWheelDto.end_date) {
            const startDate = new Date(createWheelDto.start_date);
            const endDate = new Date(createWheelDto.end_date);
            if (startDate >= endDate) {
                throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
            }
        }

        const wheel = this.luckyWheelRepository.create({
            ...createWheelDto,
            start_date: createWheelDto.start_date ? new Date(createWheelDto.start_date) : null,
            end_date: createWheelDto.end_date ? new Date(createWheelDto.end_date) : null,
        });

        return this.luckyWheelRepository.save(wheel);
    }

    async findAllWheels(): Promise<LuckyWheel[]> {
        return this.luckyWheelRepository.find({
            relations: ['prizes'],
            order: { created_at: 'DESC' },
        });
    }

    async findActiveWheels(): Promise<LuckyWheel[]> {
        const now = new Date();
        return this.luckyWheelRepository
            .createQueryBuilder('wheel')
            .leftJoinAndSelect('wheel.prizes', 'prizes')
            .where('wheel.status = :status', { status: LuckyWheelStatus.ACTIVE })
            .andWhere('(wheel.start_date IS NULL OR wheel.start_date <= :now)', { now })
            .andWhere('(wheel.end_date IS NULL OR wheel.end_date >= :now)', { now })
            .orderBy('wheel.created_at', 'DESC')
            .getMany();
    }

    async findWheelById(id: string): Promise<LuckyWheel> {
        const wheel = await this.luckyWheelRepository.findOne({
            where: { id },
            relations: ['prizes', 'campaign'],
        });

        if (!wheel) {
            throw new NotFoundException(`Vòng quay với ID ${id} không tồn tại`);
        }

        return wheel;
    }

    async deleteWheel(id: string): Promise<void> {
        const wheel = await this.findWheelById(id);
        await this.luckyWheelRepository.remove(wheel);
    }
    //#endregion

    //#region Prize Management
    async createPrize(createPrizeDto: CreateLuckyWheelPrizeDto): Promise<LuckyWheelPrize> {
        // Validate wheel exists
        await this.findWheelById(createPrizeDto.wheel_id);

        // Validate prize data based on type
        if (createPrizeDto.type === PrizeType.POINTS && !createPrizeDto.points_value) {
            throw new BadRequestException('Giá trị điểm là bắt buộc cho phần thưởng điểm');
        }
        if (createPrizeDto.type === PrizeType.VOUCHER && !createPrizeDto.voucher_id) {
            throw new BadRequestException('ID voucher là bắt buộc cho phần thưởng voucher');
        }

        // Check if total probability doesn't exceed 100%
        const existingPrizes = await this.prizeRepository.find({
            where: { wheel_id: createPrizeDto.wheel_id, is_active: true },
        });

        const totalProbability = existingPrizes.reduce((sum, prize) => sum + Number(prize.probability), 0);
        if (totalProbability + createPrizeDto.probability > 100) {
            throw new BadRequestException(`Tổng xác suất vượt quá 100%. Hiện tại: ${totalProbability}%, thêm: ${createPrizeDto.probability}%`);
        }

        const prize = this.prizeRepository.create(createPrizeDto);
        return this.prizeRepository.save(prize);
    }

    async findPrizesByWheelId(wheelId: string): Promise<LuckyWheelPrize[]> {
        return this.prizeRepository.find({
            where: { wheel_id: wheelId, is_active: true },
            relations: ['voucher'],
            order: { probability: 'DESC' },
        });
    }

    async deletePrize(id: string): Promise<void> {
        const prize = await this.prizeRepository.findOne({ where: { id } });
        if (!prize) {
            throw new NotFoundException(`Phần thưởng với ID ${id} không tồn tại`);
        }
        await this.prizeRepository.remove(prize);
    }
    //#endregion

    //#region Spin Logic
    async spinWheel(userId: string, spinDto: SpinWheelDto): Promise<SpinResultDto> {
        const wheel = await this.findWheelById(spinDto.wheel_id);

        // Check if wheel is active and within time range
        await this.validateWheelAccess(wheel, userId);

        // Check daily spin limit
        const todaySpins = await this.getTodaySpinCount(userId, wheel.id);
        if (todaySpins >= wheel.daily_spin_limit) {
            throw new BadRequestException(`Bạn đã hết lượt quay hôm nay. Giới hạn: ${wheel.daily_spin_limit} lần/ngày`);
        }

        // Check and deduct points if required
        let pointTransactionId: string | null = null;
        if (wheel.cost_points > 0) {
            const hasEnoughPoints = await this.pointHelperService.checkUserBalance(userId, wheel.cost_points);
            if (!hasEnoughPoints) {
                throw new BadRequestException(`Không đủ điểm để quay. Cần: ${wheel.cost_points} điểm`);
            }

            const pointResult = await this.pointHelperService.handleOrderPayment(
                userId,
                wheel.cost_points,
                `Vòng quay: ${wheel.name}`
            );
            pointTransactionId = pointResult.transaction.id;
        }

        // Create spin record
        const spin = this.spinRepository.create({
            user_id: userId,
            wheel_id: wheel.id,
            cost_points: wheel.cost_points,
            status: SpinStatus.PENDING,
            point_transaction_id: pointTransactionId,
        });

        const savedSpin = await this.spinRepository.save(spin);

        try {
            // Select prize based on probability
            const selectedPrize = await this.selectRandomPrize(wheel.id);
            const spinAngle = Math.random() * 360; // Random spin angle

            // Process prize reward
            const rewardResult = await this.processPrizeReward(userId, selectedPrize, savedSpin);

            // Update spin record
            savedSpin.prize_id = selectedPrize?.id || null;
            savedSpin.status = SpinStatus.COMPLETED;
            savedSpin.completed_at = new Date();
            savedSpin.spin_angle = spinAngle;
            savedSpin.result_description = rewardResult.message;

            if (rewardResult.reward_point_transaction_id) {
                savedSpin.reward_point_transaction_id = rewardResult.reward_point_transaction_id;
            }
            if (rewardResult.voucher_user_id) {
                savedSpin.voucher_user_id = rewardResult.voucher_user_id;
            }

            await this.spinRepository.save(savedSpin);

            // Get updated user balance and remaining spins
            const currentPoints = await this.pointHelperService.getUserBalance(userId);
            const remainingSpins = wheel.daily_spin_limit - (todaySpins + 1);

            return {
                spin_id: savedSpin.id,
                success: true,
                message: rewardResult.message,
                prize: selectedPrize ? {
                    id: selectedPrize.id,
                    name: selectedPrize.name,
                    type: selectedPrize.type,
                    points_value: selectedPrize.points_value,
                    voucher: selectedPrize.voucher ? {
                        id: selectedPrize.voucher.id,
                        code: selectedPrize.voucher.code,
                        description: selectedPrize.voucher.description,
                    } : undefined,
                    color: selectedPrize.color,
                    icon_url: selectedPrize.icon_url,
                } : undefined,
                spin_angle: spinAngle,
                remaining_spins: remainingSpins,
                current_points: currentPoints,
            };

        } catch (error) {
            // Handle error: mark spin as failed and potentially refund points
            savedSpin.status = SpinStatus.FAILED;
            savedSpin.error_message = error.message;
            await this.spinRepository.save(savedSpin);

            // Refund points if they were deducted
            if (pointTransactionId && wheel.cost_points > 0) {
                await this.pointHelperService.handleOrderReward(
                    userId,
                    wheel.cost_points,
                    `Hoàn trả điểm - Lỗi vòng quay: ${wheel.name}`
                );
            }

            throw error;
        }
    }

    private async validateWheelAccess(wheel: LuckyWheel, userId: string): Promise<void> {
        if (wheel.status !== LuckyWheelStatus.ACTIVE) {
            throw new BadRequestException('Vòng quay hiện không hoạt động');
        }

        const now = new Date();
        if (wheel.start_date && now < wheel.start_date) {
            throw new BadRequestException('Vòng quay chưa bắt đầu');
        }
        if (wheel.end_date && now > wheel.end_date) {
            throw new BadRequestException('Vòng quay đã kết thúc');
        }

        // Check campaign access if wheel is part of campaign
        if (wheel.type === LuckyWheelType.CAMPAIGN && wheel.campaign_id) {
            // You can add campaign validation logic here
            // For now, we'll allow access
        }
    }

    private async getTodaySpinCount(userId: string, wheelId: string): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return this.spinRepository.count({
            where: {
                user_id: userId,
                wheel_id: wheelId,
                created_at: Between(startOfDay, endOfDay),
                status: SpinStatus.COMPLETED,
            },
        });
    }

    private async selectRandomPrize(wheelId: string): Promise<LuckyWheelPrize | null> {
        const prizes = await this.prizeRepository.find({
            where: { wheel_id: wheelId, is_active: true },
            relations: ['voucher'],
        });

        if (prizes.length === 0) {
            return null;
        }

        // Filter out prizes that have reached max quantity
        const availablePrizes = prizes.filter(prize =>
            prize.max_quantity === -1 || prize.used_quantity < prize.max_quantity
        );

        if (availablePrizes.length === 0) {
            return null;
        }

        // Generate random number 0-100
        const random = Math.random() * 100;
        let cumulativeProbability = 0;

        for (const prize of availablePrizes) {
            cumulativeProbability += Number(prize.probability);
            if (random <= cumulativeProbability) {
                // Update used quantity
                if (prize.max_quantity !== -1) {
                    prize.used_quantity += 1;
                    await this.prizeRepository.save(prize);
                }
                return prize;
            }
        }

        return null; // No prize won
    }

    private async processPrizeReward(
        userId: string,
        prize: LuckyWheelPrize | null,
        spin: LuckyWheelSpin
    ): Promise<{
        message: string;
        reward_point_transaction_id?: string;
        voucher_user_id?: string;
    }> {
        if (!prize) {
            return { message: 'Chúc bạn may mắn lần sau!' };
        }

        switch (prize.type) {
            case PrizeType.POINTS:
                const pointResult = await this.pointHelperService.handleOrderReward(
                    userId,
                    prize.points_value,
                    `Thưởng vòng quay: ${prize.name}`
                );
                return {
                    message: `Chúc mừng! Bạn đã trúng ${prize.points_value} điểm!`,
                    reward_point_transaction_id: pointResult.transaction.id,
                };

            case PrizeType.VOUCHER:
                if (!prize.voucher) {
                    throw new BadRequestException('Voucher không tồn tại');
                }

                const voucherUser = await this.voucherService.createVoucherUser(
                    userId,
                    prize.voucher.id,
                    {
                        from: VoucherUserFromEnum.WHEEL_OF_FORTUNE,
                        status: VoucherUserStatusEnum.AVAILABLE,
                        assigned_at: new Date().toISOString(),
                    }
                );

                return {
                    message: `Chúc mừng! Bạn đã trúng voucher "${prize.voucher.code}"!`,
                    voucher_user_id: `${voucherUser.voucher_id}-${voucherUser.user_id}`, // Composite key
                };

            case PrizeType.EMPTY:
            default:
                return { message: 'Chúc bạn may mắn lần sau!' };
        }
    }
    //#endregion

    //#region Spin History
    async findUserSpinHistory(
        userId: string,
        query: FindSpinHistoryDto
    ): Promise<{
        data: LuckyWheelSpin[];
        pagination: {
            current: number;
            pageSize: number;
            totalPage: number;
            totalItem: number;
        };
    }> {
        const { current = 1, pageSize = 10, wheel_id } = query;
        const skip = (current - 1) * pageSize;

        const queryBuilder = this.spinRepository.createQueryBuilder('spin')
            .leftJoinAndSelect('spin.wheel', 'wheel')
            .leftJoinAndSelect('spin.prize', 'prize')
            .leftJoinAndSelect('prize.voucher', 'voucher')
            .where('spin.user_id = :userId', { userId })
            .orderBy('spin.created_at', 'DESC');

        if (wheel_id) {
            queryBuilder.andWhere('spin.wheel_id = :wheelId', { wheelId: wheel_id });
        }

        const [data, totalItem] = await queryBuilder
            .skip(skip)
            .take(pageSize)
            .getManyAndCount();

        const totalPage = Math.ceil(totalItem / pageSize);

        return {
            data,
            pagination: {
                current,
                pageSize,
                totalPage,
                totalItem,
            },
        };
    }
    //#endregion

    //#region Wheel Statistics
    async getWheelStatistics(wheelId: string): Promise<any> {
        const wheel = await this.findWheelById(wheelId);

        const totalSpins = await this.spinRepository.count({
            where: { wheel_id: wheelId, status: SpinStatus.COMPLETED },
        });

        const prizeStats = await this.spinRepository
            .createQueryBuilder('spin')
            .leftJoinAndSelect('spin.prize', 'prize')
            .where('spin.wheel_id = :wheelId', { wheelId })
            .andWhere('spin.status = :status', { status: SpinStatus.COMPLETED })
            .getMany();

        const prizeCount = {};
        prizeStats.forEach(spin => {
            if (spin.prize) {
                prizeCount[spin.prize.name] = (prizeCount[spin.prize.name] || 0) + 1;
            } else {
                prizeCount['Không trúng'] = (prizeCount['Không trúng'] || 0) + 1;
            }
        });

        return {
            wheel,
            total_spins: totalSpins,
            prize_statistics: prizeCount,
        };
    }
    //#endregion
    
} 