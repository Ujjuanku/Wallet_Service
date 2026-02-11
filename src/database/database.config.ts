
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { User } from './entities/user.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';


// Helper to mask secrets
const mask = (str: string | undefined) => str ? '******' : 'undefined';

console.log('🔍 Database Config Check:');
console.log(`DATABASE_URL: ${mask(process.env.DATABASE_URL)}`);
console.log(`PGHOST: ${process.env.PGHOST || 'undefined'}`);
console.log(`PGUSER: ${process.env.PGUSER || 'undefined'}`);
console.log(`PGDATABASE: ${process.env.PGDATABASE || 'undefined'}`);
console.log(`PGPORT: ${process.env.PGPORT || 'undefined'}`);

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.PGPORT || '5432', 10),
    username: process.env.DATABASE_USER || process.env.PGUSER || 'wallet',
    password: process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || 'wallet',
    database: process.env.DATABASE_NAME || process.env.PGDATABASE || 'wallet_db',
    entities: [Asset, User, Wallet, Transaction, LedgerEntry],
    // For Railway, we need schemas to be created. 
    // Since we can't easily run seed.sql via docker volume, we will enable sync OR run a migration.
    // Recommended: synchronize: true for this "assignment level" project to ensure tables exist.
    synchronize: true,
    // SSL is required for Railway/Heroku if using the public URL or if they enforce it.
    // We strictly enable it if we detect we are NOT on localhost (simple heuristic) OR if env var says so.
    ssl: (process.env.DATABASE_URL || process.env.PGHOST) && process.env.PGHOST !== 'localhost' ? { rejectUnauthorized: false } : false,
    retryAttempts: 10,
    retryDelay: 3000,
    logging: true, // Enable logging for debugging
};
