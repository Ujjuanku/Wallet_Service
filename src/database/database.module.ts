
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseConfig } from './database.config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const isProduction = configService.get('NODE_ENV') === 'production';
                const databaseUrl = configService.get('DATABASE_URL');
                const host = configService.get('DATABASE_HOST') || configService.get('PGHOST');
                const port = configService.get('DATABASE_PORT') || configService.get('PGPORT') || 5432;
                const username = configService.get('DATABASE_USER') || configService.get('PGUSER');
                const password = configService.get('DATABASE_PASSWORD') || configService.get('PGPASSWORD');
                const database = configService.get('DATABASE_NAME') || configService.get('PGDATABASE');

                // Mask secrets for logging
                const mask = (s: string) => s ? '******' : 'undefined';
                console.log('🔍 DB Config Factory:');
                console.log(`URL: ${mask(databaseUrl)}`);
                console.log(`Host: ${host}, Port: ${port}, User: ${username}, DB: ${database}`);

                // Prioritize DATABASE_URL
                if (databaseUrl) {
                    return {
                        type: 'postgres',
                        url: databaseUrl,
                        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                        synchronize: true, // Auto-schema for this assignment
                        ssl: { rejectUnauthorized: false }, // Railway requires SSL for direct connections usually
                        retryAttempts: 10,
                        retryDelay: 3000,
                        logging: true,
                    };
                }

                return {
                    type: 'postgres',
                    host: host || 'localhost',
                    port: parseInt(port, 10),
                    username: username || 'wallet',
                    password: password || 'wallet',
                    database: database || 'wallet_db',
                    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                    synchronize: true,
                    // Auto-enable SSL if not localhost
                    ssl: (host && host !== 'localhost') ? { rejectUnauthorized: false } : false,
                    retryAttempts: 10,
                    retryDelay: 3000,
                    logging: true,
                };
            },
        }),
    ],
})
export class DatabaseModule { }
