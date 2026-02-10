
import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('assets')
export class Asset {
  @PrimaryColumn()
  id: string; // e.g., 'GOLD_COIN', 'DIAMOND'

  @Column()
  name: string; // Display name

  @Column({ default: 2 })
  scale: number; // Decimal precision (e.g., 2 for 10.00)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
