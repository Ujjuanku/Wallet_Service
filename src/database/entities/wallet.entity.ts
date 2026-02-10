
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Asset } from './asset.entity';

export enum WalletType {
    USER = 'USER',
    SYSTEM = 'SYSTEM',
}

@Entity('wallets')
@Index(['userId', 'assetId'], { unique: true, where: '"user_id" IS NOT NULL' }) // Ensures a user has only one wallet per asset
export class Wallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true, type: 'uuid' })
    userId: string | null;

    @ManyToOne(() => User, (user) => user.wallets, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ name: 'asset_id' })
    assetId: string;

    @ManyToOne(() => Asset)
    @JoinColumn({ name: 'asset_id' })
    asset: Asset;

    @Column({ type: 'enum', enum: WalletType, default: WalletType.USER })
    type: WalletType;

    // We are NOT storing a balance column to strictly follow the ledger requirement.
    // Balances are derived on read or via snapshot logic (but here purely derived).

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
