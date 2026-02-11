import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DataSource } from 'typeorm';
import { databaseConfig } from './database/database.config';
import { Asset } from './database/entities/asset.entity';
import { User } from './database/entities/user.entity';
import { Wallet, WalletType } from './database/entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from './database/entities/transaction.entity';
import { LedgerEntry, LedgerEntryType } from './database/entities/ledger-entry.entity';

async function seedData() {
  const dataSource = new DataSource(databaseConfig as any);
  try {
    await dataSource.initialize();

    // Check if data exists to avoid re-seeding unnecessarily
    const assetRepo = dataSource.getRepository(Asset);
    const count = await assetRepo.count();
    if (count > 0) {
      console.log('Data already exists, skipping seed.');
      await dataSource.destroy();
      return;
    }

    console.log('Seeding Assets...');
    await assetRepo.save([
      { id: 'GOLD', name: 'Gold Coins', scale: 2 },
      { id: 'DIAMOND', name: 'Diamonds', scale: 2 }
    ]);

    console.log('Seeding Users...');
    const userRepo = dataSource.getRepository(User);
    const systemUser = await userRepo.save({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', username: 'system_treasury' });
    const alice = await userRepo.save({ id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', username: 'alice' });
    const bob = await userRepo.save({ id: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', username: 'bob' });

    console.log('Seeding Wallets...');
    const walletRepo = dataSource.getRepository(Wallet);
    const systemGoldWallet = await walletRepo.save({ id: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380d44', userId: systemUser.id, assetId: 'GOLD', type: WalletType.SYSTEM });
    await walletRepo.save({ id: 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380e55', userId: systemUser.id, assetId: 'DIAMOND', type: WalletType.SYSTEM });
    const aliceGoldWallet = await walletRepo.save({ id: 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380f66', userId: alice.id, assetId: 'GOLD', type: WalletType.USER });
    const bobGoldWallet = await walletRepo.save({ id: '06eebc99-9c0b-4ef8-bb6d-6bb9bd380077', userId: bob.id, assetId: 'GOLD', type: WalletType.USER });

    console.log('Seeding Initial Transactions...');
    const txRepo = dataSource.getRepository(Transaction);
    const ledgerRepo = dataSource.getRepository(LedgerEntry);

    const tx1 = await txRepo.save({
      id: '17eebc99-9c0b-4ef8-bb6d-6bb9bd380188',
      type: TransactionType.BONUS,
      status: TransactionStatus.COMPLETED,
      metadata: { reason: 'seed' }
    });

    await ledgerRepo.save([
      { id: '28eebc99-9c0b-4ef8-bb6d-6bb9bd380299', transaction: tx1, walletId: systemGoldWallet.id, amount: -100, balanceAfter: -100, type: LedgerEntryType.DEBIT },
      { id: '39eebc99-9c0b-4ef8-bb6d-6bb9bd380300', transaction: tx1, walletId: aliceGoldWallet.id, amount: 100, balanceAfter: 100, type: LedgerEntryType.CREDIT }
    ]);

    const tx2 = await txRepo.save({
      id: '40eebc99-9c0b-4ef8-bb6d-6bb9bd380411',
      type: TransactionType.BONUS,
      status: TransactionStatus.COMPLETED,
      metadata: { reason: 'seed' }
    });

    await ledgerRepo.save([
      { id: '51eebc99-9c0b-4ef8-bb6d-6bb9bd380522', transaction: tx2, walletId: systemGoldWallet.id, amount: -50, balanceAfter: -150, type: LedgerEntryType.DEBIT },
      { id: '62eebc99-9c0b-4ef8-bb6d-6bb9bd380633', transaction: tx2, walletId: bobGoldWallet.id, amount: 50, balanceAfter: 50, type: LedgerEntryType.CREDIT }
    ]);

    console.log('Seeding Complete!');
    await dataSource.destroy();
  } catch (err) {
    console.error('Seeding failed (non-fatal, app will start):', err);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

async function bootstrap() {
  console.log('🚀 Starting Bootstrap...');

  if (process.env.DATABASE_URL) {
    console.log('🌱 DATABASE_URL found, attempting seed...');
    await seedData();
    console.log('✅ Seeding check complete.');
  } else {
    console.log('⚠️ No DATABASE_URL found, skipping seed.');
  }

  console.log('🏗 Creating NestJS App...');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 8080;
  console.log(`🌍 App starting to listen on port ${port} (0.0.0.0)...`);

  await app.listen(port, '0.0.0.0');
  console.log('🚀 Server is running!');
}
bootstrap();
