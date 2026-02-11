
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { User } from './entities/user.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL, // Priority for Railway/Heroku
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'wallet',
    password: process.env.DATABASE_PASSWORD || 'wallet',
    database: process.env.DATABASE_NAME || 'wallet_db',
    entities: [Asset, User, Wallet, Transaction, LedgerEntry],
    // For Railway, we need schemas to be created. 
    // Since we can't easily run seed.sql via docker volume, we will enable sync OR run a migration.
    // Recommended: synchronize: true for this "assignment level" project to ensure tables exist.
    synchronize: true,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    retryAttempts: 10,
    retryDelay: 3000,
    logging: true, // Enable logging for debugging
};
