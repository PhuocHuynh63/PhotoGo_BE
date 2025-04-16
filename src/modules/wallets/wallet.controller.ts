import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@ApiTags('Wallets')
@ApiBearerAuth('access-token')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

    @Get()
    @ApiOperation({ summary: 'Retrieve all wallets' })
    @ApiResponse({ status: 200, description: 'List of wallets', type: [Wallet] })
    async findAll(): Promise<Wallet[]> {
        return await this.walletService.findAll();
    }

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully', type: Wallet })
  async createWallet(@Body() createWalletDto: CreateWalletDto): Promise<Wallet> {
    return await this.walletService.createWallet(createWalletDto);
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Create a wallet transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: WalletTransaction })
  async createTransaction(@Body() createWalletTransactionDto: CreateWalletTransactionDto): Promise<WalletTransaction> {
    return await this.walletService.createTransaction(createWalletTransactionDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a wallet by ID' })
  @ApiResponse({ status: 200, description: 'Wallet details', type: Wallet })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findWalletById(@Param('id') id: string): Promise<Wallet> {
    return await this.walletService.findWalletById(id);
  }

    @Get(':id/transactions')
    @ApiOperation({ summary: 'Retrieve all transactions for a wallet' })
    @ApiResponse({ status: 200, description: 'List of transactions', type: [WalletTransaction] })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async findTransactionsByWalletId(@Param('id') id: string): Promise<WalletTransaction[]> {
        return await this.walletService.findTransactionsByWalletId(id);
    }
}