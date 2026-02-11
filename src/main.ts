import 'reflect-metadata'; // Required for TypeORM
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// ... (existing imports, but make sure they stay valid)

// ... seedData function ...

async function bootstrap() {
  try {
    console.log('🚀 Starting Bootstrap...');

    if (process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGHOST !== 'localhost')) {
      console.log('🌱 Database connection info found, attempting seed...');
      await seedData();
      console.log('✅ Seeding check complete.');
    } else {
      console.log('⚠️ No production database info found, skipping seed.');
    }

    console.log('🏗 Creating NestJS App...');
    const app = await NestFactory.create(AppModule);

    const port = process.env.PORT ?? 8080;
    console.log(`🌍 App starting to listen on port ${port} (0.0.0.0)...`);

    await app.listen(port, '0.0.0.0');
    console.log('🚀 Server is running!');
  } catch (err) {
    console.error('❌ Bootstrap failed:', err);
    process.exit(1);
  }
}
bootstrap();
