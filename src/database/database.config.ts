
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { User } from './entities/user.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'wallet',
    password: process.env.DATABASE_PASSWORD || 'wallet',
    database: process.env.DATABASE_NAME || 'wallet_db',
    entities: [Asset, User, Wallet, Transaction, LedgerEntry],
    synchronize: false, // We use seed.sql to create tables mostly, or manual migration.
    // Actually, setting to true is easier for dev if we remove CREATE TABLE from seed. 
    // But we have CREATE TABLE IF NOT EXISTS in seed, so false is safer to avoid conflicts OR true if we trust TypeORM to match.
    // Let's set to FALSE to respect the assignment's manual DDL/Seed approach.
};
