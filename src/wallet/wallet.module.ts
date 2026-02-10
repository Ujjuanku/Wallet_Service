
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet } from '../database/entities/wallet.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { LedgerEntry } from '../database/entities/ledger-entry.entity';
import { Asset } from '../database/entities/asset.entity';
import { User } from '../database/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Wallet, Transaction, LedgerEntry, Asset, User]),
    ],
    controllers: [WalletController],
    providers: [WalletService],
})
export class WalletModule { }
