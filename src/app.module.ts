import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RevenueModule } from './revenue/revenue.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';
import { EmployeesModule } from './employees/employees.module';
import { HolidaysModule } from './holidays/holidays.module';
import { ScheduleModule } from './schedule/schedule.module';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';

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
    EmployeesModule,
    HolidaysModule,
    ScheduleModule,
    CalendarEventsModule,
  ],
})
export class AppModule {}
