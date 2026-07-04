import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RevenueModule } from '../revenue/revenue.module';
import { CashMovementsModule } from '../cash-movements/cash-movements.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { CofreReset, CofreResetSchema } from './schemas/cofre-reset.schema';

@Module({
  imports: [
    RevenueModule,
    CashMovementsModule,
    MongooseModule.forFeature([
      { name: CofreReset.name, schema: CofreResetSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
