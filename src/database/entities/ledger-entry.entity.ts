
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Transaction } from './transaction.entity';
import { Wallet } from './wallet.entity';

export enum LedgerEntryType {
    CREDIT = 'CREDIT', // Income
    DEBIT = 'DEBIT',   // Expense
}

@Entity('ledger_entries')
export class LedgerEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'transaction_id', type: 'uuid' })
    transactionId: string;

    @ManyToOne(() => Transaction)
    @JoinColumn({ name: 'transaction_id' })
    transaction: Transaction;

    @Column({ name: 'wallet_id', type: 'uuid' })
    @Index() // Crucial for balance calculation
    walletId: string;

    @ManyToOne(() => Wallet)
    @JoinColumn({ name: 'wallet_id' })
    wallet: Wallet;

    // Amount is always positive in business logic, but signed in query or logic?
    // Convention:
    // CREDIT: +Amount
    // DEBIT: -Amount
    // Let's store signed amount for easy SUM().
    @Column({ type: 'decimal', precision: 20, scale: 2 })
    amount: number;

    @Column({ name: 'balance_after', type: 'decimal', precision: 20, scale: 2, nullable: true })
    balanceAfter: number; // Optional snapshot for easier debugging

    @Column({ type: 'enum', enum: LedgerEntryType })
    type: LedgerEntryType;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
