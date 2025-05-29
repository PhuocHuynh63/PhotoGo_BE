import { Controller, Post, Get, Param, Body, Put, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@ApiTags('Wallets')
@ApiBearerAuth('access-token')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo một ví mới' })
  @ApiResponse({ status: 201, description: 'Ví đã được tạo thành công', type: Wallet })
  async createWallet(@Body() createWalletDto: CreateWalletDto): Promise<Wallet> {
    return await this.walletService.createWallet(createWalletDto);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Tạo một giao dịch ví' })
  @ApiResponse({ status: 201, description: 'Giao dịch đã được tạo thành công', type: WalletTransaction })
  async createTransaction(@Body() createWalletTransactionDto: CreateWalletTransactionDto): Promise<WalletTransaction> {
    return await this.walletService.createTransaction(createWalletTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả các ví' })
  @ApiResponse({ status: 200, description: 'Danh sách các ví', type: [Wallet] })
  async findAll(): Promise<Wallet[]> {
    return await this.walletService.findAll();
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Lấy tất cả các giao dịch cho một ví' })
  @ApiResponse({ status: 200, description: 'Danh sách các giao dịch', type: [WalletTransaction] })
  @ApiResponse({ status: 404, description: 'Ví không tồn tại' })
  async findTransactionsByWalletId(@Param('id') id: string): Promise<WalletTransaction[]> {
    return await this.walletService.findTransactionsByWalletId(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết của một ví' })
  @ApiResponse({ status: 200, description: 'Chi tiết của ví', type: Wallet })
  @ApiResponse({ status: 404, description: 'Ví không tồn tại' })
  async findWalletById(@Param('id') id: string): Promise<Wallet> {
    return await this.walletService.findWalletById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật một ví bằng ID' })
  @ApiResponse({ status: 200, description: 'Ví đã được cập nhật thành công', type: Wallet })
  @ApiResponse({ status: 404, description: 'Ví không tồn tại' })
  async update(@Param('id') id: string, @Body() updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    return this.walletService.update(id, updateWalletDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một ví bằng ID' })
  @ApiResponse({ status: 200, description: 'Ví đã được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Ví không tồn tại' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.walletService.remove(id);
  }
}