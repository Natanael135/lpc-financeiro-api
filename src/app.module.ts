import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RevenueModule } from './revenue/revenue.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { PurchasesModule } from './purchases/purchases.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    RevenueModule,
    CashMovementsModule,
    DashboardModule,
    UploadsModule,
    HealthModule,
    PurchasesModule,
  ],
})
export class AppModule {}
