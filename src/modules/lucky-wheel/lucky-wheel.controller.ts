import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LuckyWheelService } from './lucky-wheel.service';
import { CreateLuckyWheelDto } from './dto/create-lucky-wheel.dto';
import { CreateLuckyWheelPrizeDto } from './dto/create-lucky-wheel-prize.dto';
import { SpinWheelDto, SpinResultDto, FindSpinHistoryDto } from './dto/spin-wheel.dto';
import { LuckyWheel } from './entities/lucky-wheel.entity';
import { LuckyWheelPrize } from './entities/lucky-wheel-prize.entity';
import { LuckyWheelSpin } from './entities/lucky-wheel-spin.entity';
import { CurrentUserId } from 'src/decorator/user.decorator';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { JwtAuthGuard } from '../auth/passport/jwt-auth.guard';
import { RolesGuard } from '../auth/passport/roles.guard';
import { Roles } from '../../decorator/role.decorator';
import { Role } from '../roles/entities/role.entity';

@ApiTags('Lucky Wheel')
@Controller('lucky-wheel')
@ApiBearerAuth('access-token')
export class LuckyWheelController {
    constructor(private readonly luckyWheelService: LuckyWheelService) { }

    //#region Admin Endpoints - Wheel Management
    @Post('admin/wheels')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Tạo vòng quay mới (Admin)' })
    @ApiResponse({ status: 201, description: 'Vòng quay đã được tạo thành công', type: LuckyWheel })
    @ResponseMessage('Tạo vòng quay thành công')
    async createWheel(@Body() createWheelDto: CreateLuckyWheelDto): Promise<LuckyWheel> {
        return this.luckyWheelService.createWheel(createWheelDto);
    }

    @Get('admin/wheels')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Lấy tất cả vòng quay (Admin)' })
    @ApiResponse({ status: 200, description: 'Danh sách vòng quay', type: [LuckyWheel] })
    @ResponseMessage('Lấy danh sách vòng quay thành công')
    async findAllWheels(): Promise<LuckyWheel[]> {
        return this.luckyWheelService.findAllWheels();
    }

    @Get('admin/wheels/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Lấy chi tiết vòng quay (Admin)' })
    @ApiParam({ name: 'id', description: 'ID vòng quay' })
    @ApiResponse({ status: 200, description: 'Chi tiết vòng quay', type: LuckyWheel })
    @ResponseMessage('Lấy chi tiết vòng quay thành công')
    async findWheelById(@Param('id') id: string): Promise<LuckyWheel> {
        return this.luckyWheelService.findWheelById(id);
    }

    @Delete('admin/wheels/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Xóa vòng quay (Admin)' })
    @ApiParam({ name: 'id', description: 'ID vòng quay' })
    @ApiResponse({ status: 200, description: 'Vòng quay đã được xóa thành công' })
    @ResponseMessage('Xóa vòng quay thành công')
    async deleteWheel(@Param('id') id: string): Promise<{ message: string }> {
        await this.luckyWheelService.deleteWheel(id);
        return { message: 'Vòng quay đã được xóa thành công' };
    }

    @Get('admin/wheels/:id/statistics')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Lấy thống kê vòng quay (Admin)' })
    @ApiParam({ name: 'id', description: 'ID vòng quay' })
    @ApiResponse({ status: 200, description: 'Thống kê vòng quay' })
    @ResponseMessage('Lấy thống kê vòng quay thành công')
    async getWheelStatistics(@Param('id') id: string): Promise<any> {
        return this.luckyWheelService.getWheelStatistics(id);
    }
    //#endregion

    //#region Admin Endpoints - Prize Management
    @Post('admin/prizes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Tạo phần thưởng cho vòng quay (Admin)' })
    @ApiResponse({ status: 201, description: 'Phần thưởng đã được tạo thành công', type: LuckyWheelPrize })
    @ResponseMessage('Tạo phần thưởng thành công')
    async createPrize(@Body() createPrizeDto: CreateLuckyWheelPrizeDto): Promise<LuckyWheelPrize> {
        return this.luckyWheelService.createPrize(createPrizeDto);
    }

    @Get('admin/wheels/:wheelId/prizes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Lấy danh sách phần thưởng của vòng quay (Admin)' })
    @ApiParam({ name: 'wheelId', description: 'ID vòng quay' })
    @ApiResponse({ status: 200, description: 'Danh sách phần thưởng', type: [LuckyWheelPrize] })
    @ResponseMessage('Lấy danh sách phần thưởng thành công')
    async findPrizesByWheelId(@Param('wheelId') wheelId: string): Promise<LuckyWheelPrize[]> {
        return this.luckyWheelService.findPrizesByWheelId(wheelId);
    }

    @Delete('admin/prizes/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles({ id: 'R001', name: 'admin' } as Role)
    @ApiOperation({ summary: 'Xóa phần thưởng (Admin)' })
    @ApiParam({ name: 'id', description: 'ID phần thưởng' })
    @ApiResponse({ status: 200, description: 'Phần thưởng đã được xóa thành công' })
    @ResponseMessage('Xóa phần thưởng thành công')
    async deletePrize(@Param('id') id: string): Promise<{ message: string }> {
        await this.luckyWheelService.deletePrize(id);
        return { message: 'Phần thưởng đã được xóa thành công' };
    }
    //#endregion

    //#region User Endpoints
    @Get('wheels')
    @Public()
    @ApiOperation({ summary: 'Lấy danh sách vòng quay đang hoạt động (Public)' })
    @ApiResponse({ status: 200, description: 'Danh sách vòng quay hoạt động', type: [LuckyWheel] })
    @ResponseMessage('Lấy danh sách vòng quay thành công')
    async findActiveWheels(): Promise<LuckyWheel[]> {
        return this.luckyWheelService.findActiveWheels();
    }

    @Get('wheels/:id')
    @Public()
    @ApiOperation({ summary: 'Lấy chi tiết vòng quay với phần thưởng (Public)' })
    @ApiParam({ name: 'id', description: 'ID vòng quay' })
    @ApiResponse({ status: 200, description: 'Chi tiết vòng quay' })
    @ResponseMessage('Lấy chi tiết vòng quay thành công')
    async findActiveWheelById(@Param('id') id: string): Promise<{
        wheel: LuckyWheel;
        prizes: LuckyWheelPrize[];
    }> {
        const wheel = await this.luckyWheelService.findWheelById(id);
        const prizes = await this.luckyWheelService.findPrizesByWheelId(id);
        return { wheel, prizes };
    }

    @Post('spin')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Quay vòng may mắn (User)' })
    @ApiResponse({ status: 200, description: 'Kết quả quay', type: SpinResultDto })
    @ResponseMessage('Quay vòng thành công')
    async spinWheel(
        @CurrentUserId() userId: string,
        @Body() spinDto: SpinWheelDto
    ): Promise<SpinResultDto> {
        return this.luckyWheelService.spinWheel(userId, spinDto);
    }

    @Get('my-spins')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Lấy lịch sử quay của user (User)' })
    @ApiQuery({ name: 'current', required: false, type: Number, description: 'Trang hiện tại' })
    @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Số lượng mỗi trang' })
    @ApiQuery({ name: 'wheel_id', required: false, type: String, description: 'ID vòng quay (filter)' })
    @ApiResponse({ status: 200, description: 'Lịch sử quay của user' })
    @ResponseMessage('Lấy lịch sử quay thành công')
    async findMySpinHistory(
        @CurrentUserId() userId: string,
        @Query(ValidationPipe) query: FindSpinHistoryDto
    ): Promise<{
        data: LuckyWheelSpin[];
        pagination: {
            current: number;
            pageSize: number;
            totalPage: number;
            totalItem: number;
        };
    }> {
        return this.luckyWheelService.findUserSpinHistory(userId, query);
    }

    @Get('my-spins/today-count/:wheelId')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Lấy số lần đã quay hôm nay (User)' })
    @ApiParam({ name: 'wheelId', description: 'ID vòng quay' })
    @ApiResponse({ status: 200, description: 'Thông tin lượt quay hôm nay' })
    @ResponseMessage('Lấy thông tin lượt quay thành công')
    async getTodaySpinInfo(
        @CurrentUserId() userId: string,
        @Param('wheelId') wheelId: string
    ): Promise<{
        wheel_id: string;
        today_spins: number;
        daily_limit: number;
        remaining_spins: number;
        can_spin: boolean;
    }> {
        const wheel = await this.luckyWheelService.findWheelById(wheelId);

        // Get today's spin count using the private method logic
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // We can't access private method directly, so we'll get user history and count today's spins
        const todayHistory = await this.luckyWheelService.findUserSpinHistory(userId, {
            wheel_id: wheelId,
            current: 1,
            pageSize: 100, // Get enough to count today's spins
        });

        const todaySpins = todayHistory.data.filter(spin => {
            const spinDate = new Date(spin.created_at);
            return spinDate >= startOfDay && spinDate <= endOfDay && spin.status === 'completed';
        }).length;

        const remainingSpins = Math.max(0, wheel.daily_spin_limit - todaySpins);

        return {
            wheel_id: wheelId,
            today_spins: todaySpins,
            daily_limit: wheel.daily_spin_limit,
            remaining_spins: remainingSpins,
            can_spin: remainingSpins > 0,
        };
    }
    //#endregion
} 