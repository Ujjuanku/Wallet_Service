
import { Controller, Post, Body, Get, Param, BadRequestException, HttpCode } from '@nestjs/common';
import { WalletService, CreateTransactionDto } from './wallet.service';
import { TransactionType } from '../database/entities/transaction.entity';
import { randomUUID } from 'crypto';

class TopupDto {
    userId: string;
    amount: number;
    assetId: string;
    idempotencyKey?: string;
}

// Reuse for Bonus/Spend
class TransactionRequestDto {
    userId: string;
    amount: number;
    assetId: string;
    idempotencyKey?: string;
}

@Controller('wallet')
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Post('topup')
    async topup(@Body() body: TopupDto) {
        if (body.amount <= 0) throw new BadRequestException('Amount must be positive');

        return this.walletService.executeTransaction({
            userId: body.userId,
            amount: body.amount,
            assetId: body.assetId,
            type: TransactionType.TOPUP,
            idempotencyKey: body.idempotencyKey || randomUUID(),
            metadata: { source: 'api' }
        });
    }

    @Post('bonus')
    async bonus(@Body() body: TransactionRequestDto) {
        if (body.amount <= 0) throw new BadRequestException('Amount must be positive');

        return this.walletService.executeTransaction({
            userId: body.userId,
            amount: body.amount,
            assetId: body.assetId,
            type: TransactionType.BONUS,
            idempotencyKey: body.idempotencyKey || randomUUID(),
            metadata: { source: 'api', reason: 'bonus' }
        });
    }

    @Post('spend')
    @HttpCode(200) // Spend is often 200 OK
    async spend(@Body() body: TransactionRequestDto) {
        if (body.amount <= 0) throw new BadRequestException('Amount must be positive');

        return this.walletService.executeTransaction({
            userId: body.userId,
            amount: body.amount,
            assetId: body.assetId,
            type: TransactionType.SPEND,
            idempotencyKey: body.idempotencyKey || randomUUID(),
            metadata: { source: 'api', item: 'purchase' }
        });
    }

    @Get(':userId/balance')
    async getBalance(@Param('userId') userId: string) {
        // For assignment, we mostly care about GOLD? Or allow querying all?
        // Requirement: GET /wallet/:userId/balance. 
        // It implies getting ALL balances? Or specific?
        // Let's assume GOLD by default or return a list if possible, but the service `getBalance` logic I wrote takes assetId.
        // Let's change the controller to return map or use query param.
        // For simplicity, let's hardcode 'GOLD' or accept query param.
        // Or better, fetch all assets.

        // Since I didn't write "getAllBalances" in service, I'll stick to 'GOLD' default or just 1 asset.
        // Wait, let's add `assetId` query param or return for GOLD.
        // Actually, better implementation: Return an object { "GOLD": 100, "DIAMOND": 50 }

        // For now, I'll just check GOLD.
        const gold = await this.walletService.getBalance(userId, 'GOLD');
        const diamond = await this.walletService.getBalance(userId, 'DIAMOND');
        return {
            userId,
            balances: {
                GOLD: gold,
                DIAMOND: diamond
            }
        };
    }

    @Get(':userId/ledger')
    async getLedger(@Param('userId') userId: string) {
        // Default to GOLD
        return this.walletService.getLedger(userId, 'GOLD');
    }
}
