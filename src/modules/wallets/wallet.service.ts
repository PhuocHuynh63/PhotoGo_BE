import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletTransactionType } from '../../constants/wallet.enum';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
  ) {}

    async findAll(): Promise<Wallet[]> {
        return await this.walletRepository.find({ relations: ['transactions'] });
    }
    
  async createWallet(createWalletDto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepository.create(createWalletDto);
    return await this.walletRepository.save(wallet);
  }

  async createTransaction(createWalletTransactionDto: CreateWalletTransactionDto): Promise<WalletTransaction> {
    const wallet = await this.walletRepository.findOne({ where: { id: createWalletTransactionDto.walletId } });

    if (!wallet) {
      throw new NotFoundException(`Ví với ID ${createWalletTransactionDto.walletId} không tồn tại`);
    }

    const transaction = this.walletTransactionRepository.create(createWalletTransactionDto);
    transaction.wallet = wallet;

    // Update wallet balance
    wallet.balance += createWalletTransactionDto.type === WalletTransactionType.DEPOSIT
      ? createWalletTransactionDto.amount
      : -createWalletTransactionDto.amount;

    await this.walletRepository.save(wallet);
    return await this.walletTransactionRepository.save(transaction);
  }

  async findWalletById(id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new NotFoundException(`Ví với ID ${id} không tồn tại`);
    }

    return wallet;
  }

    async findTransactionsByWalletId(walletId: string): Promise<WalletTransaction[]> {
        const wallet = await this.walletRepository.findOne({ where: { id: walletId }, relations: ['transactions'] });

        if (!wallet) {
            throw new NotFoundException(`Ví với ID ${walletId} không tồn tại`);
        }

        return wallet.transactions;
    }

  async update(id: string, updateWalletDto: Partial<CreateWalletDto>): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { id } });

    if (!wallet) {
      throw new NotFoundException(`Ví với ID ${id} không tồn tại`);
    }

    Object.assign(wallet, updateWalletDto);
    return await this.walletRepository.save(wallet);
  }

  async remove(id: string): Promise<void> {
    const wallet = await this.walletRepository.findOne({ where: { id } });

    if (!wallet) {
      throw new NotFoundException(`Ví với ID ${id} không tồn tại`);
    }

    await this.walletRepository.remove(wallet);
  }
}