
import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Wallet, WalletType } from '../database/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../database/entities/transaction.entity';
import { LedgerEntry, LedgerEntryType } from '../database/entities/ledger-entry.entity';
import { Asset } from '../database/entities/asset.entity';

export class CreateTransactionDto {
    userId: string;
    amount: number;
    assetId: string;
    type: TransactionType;
    idempotencyKey: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(Wallet)
        private readonly walletRepo: Repository<Wallet>,
        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,
        private readonly dataSource: DataSource,
    ) { }

    async getBalance(userId: string, assetId: string): Promise<number> {
        // We derive balance from ledger entries
        const wallet = await this.walletRepo.findOne({ where: { userId, assetId } });
        if (!wallet) {
            // If wallet doesn't exist, balance is 0 (or throw error)
            return 0;
        }

        const result = await this.dataSource
            .createQueryBuilder(LedgerEntry, 'entry')
            .select('SUM(entry.amount)', 'balance')
            .where('entry.wallet_id = :walletId', { walletId: wallet.id })
            .getRawOne();

        return parseFloat((result?.balance) || '0');
    }

    async getLedger(userId: string, assetId: string) {
        const wallet = await this.walletRepo.findOne({ where: { userId, assetId } });
        if (!wallet) return [];

        return this.dataSource
            .getRepository(LedgerEntry)
            .find({
                where: { walletId: wallet.id },
                order: { createdAt: 'DESC' },
                relations: ['transaction']
            });
    }

    async executeTransaction(dto: CreateTransactionDto): Promise<Transaction> {
        // 1. Idempotency Check (Fast check before transaction)
        const existingTx = await this.transactionRepo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
        if (existingTx) {
            return existingTx;
        }

        return this.dataSource.transaction(async (manager: EntityManager) => {
            // 2. Re-check Idempotency inside transaction lock (optional but safer)
            // Actually, define unique constraint on DB handles this. catch error.

            // 3. Determine Source and Destination Wallets
            let userWallet = await manager.findOne(Wallet, {
                where: { userId: dto.userId, assetId: dto.assetId },
                lock: { mode: 'pessimistic_write' } // Lock the user wallet!
            });

            // If user wallet doesn't exist, create it (only for credit operations? or always?)
            // For Spend, it must exist. For Topup/Bonus, we can create.
            if (!userWallet) {
                if (dto.type === TransactionType.SPEND) {
                    throw new NotFoundException('User wallet not found');
                }
                // Create wallet
                userWallet = manager.create(Wallet, {
                    userId: dto.userId,
                    assetId: dto.assetId,
                    type: WalletType.USER,
                });
                await manager.save(userWallet);
                // Lock it? It's new, so no one else has it.
            }

            // Find System Wallet
            const systemWallet = await manager.findOne(Wallet, {
                where: { assetId: dto.assetId, type: WalletType.SYSTEM },
                lock: { mode: 'pessimistic_write' } // Lock system wallet to serialize global asset moves?
                // Locking system wallet might cause high contention!
                // Optimization: Do we REALLY need to lock system wallet?
                // If system wallet balance can go negative (it's infinite source), maybe no lock needed?
                // Requirement: "Balances must never go negative". Does this apply to System? 
                // Usually System wallet is LIABILITY (+Balance = We owe users). Or ASSET.
                // Let's assume System Wallet is Source and can have negative balance (or huge positive).
                // To avoid bottlenecks, maybe we don't lock System Wallet if we don't check its balance.
                // But for strict Double Entry, we write to it. Writing doesn't require read-lock unless we read-modify-write balance column.
                // We are appending Ledger Entries.
                // Is there a race condition on Ledger Entries creation? No.
                // Race condition is on BALANCE check.
                // So, for SPEND (User -> System), we MUST lock USER wallet.
                // For TOPUP (System -> User), we MUST lock USER wallet (to prevent parallel topups? No, just to update safe).
                // Actually, strict serialization per user is enough.
                // We will NOT lock System Wallet to avoid bottleneck, assuming System has infinite funds.
            });

            if (!systemWallet) {
                throw new BadRequestException(`System wallet for asset ${dto.assetId} not found`);
            }

            // 4. Calculate Balance (if Spend)
            // Since we locked User Wallet, we can safely sum ledger.
            let currentBalance = 0;
            const balanceResult = await manager
                .createQueryBuilder(LedgerEntry, 'entry')
                .select('SUM(entry.amount)', 'balance')
                .where('entry.wallet_id = :walletId', { walletId: userWallet.id })
                .getRawOne();
            currentBalance = parseFloat(balanceResult.balance || '0');

            if (dto.type === TransactionType.SPEND && currentBalance < dto.amount) {
                throw new BadRequestException('Insufficient funds');
            }

            // 5. Create Transaction Record
            const tx = manager.create(Transaction, {
                idempotencyKey: dto.idempotencyKey,
                type: dto.type,
                status: TransactionStatus.COMPLETED,
                metadata: dto.metadata,
            });
            const savedTx = await manager.save(tx);

            // 6. Create Ledger Entries
            const entries: LedgerEntry[] = [];

            const isSpend = dto.type === TransactionType.SPEND;
            const amount = Number(dto.amount);

            // Determine balanceAfter for User
            const userBalanceAfter = isSpend
                ? currentBalance - amount
                : currentBalance + amount;

            // User Entry
            const userEntry = new LedgerEntry();
            userEntry.transaction = savedTx;
            userEntry.walletId = userWallet.id;
            userEntry.amount = isSpend ? -amount : amount;
            userEntry.balanceAfter = userBalanceAfter;
            userEntry.type = isSpend ? LedgerEntryType.DEBIT : LedgerEntryType.CREDIT;
            entries.push(userEntry);

            // System Entry
            const systemEntry = new LedgerEntry();
            systemEntry.transaction = savedTx;
            systemEntry.walletId = systemWallet.id;
            systemEntry.amount = isSpend ? amount : -amount;
            systemEntry.balanceAfter = 0; // Placeholder, we don't track system balance strictly
            systemEntry.type = isSpend ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT;
            entries.push(systemEntry);

            await manager.save(LedgerEntry, entries);

            return savedTx;
        });
    }
}
