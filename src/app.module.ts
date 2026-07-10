import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule as CronModule } from '@nestjs/schedule';
import { RevenueModule } from './revenue/revenue.module';
import { CashMovementsModule } from './cash-movements/cash-movements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';
import { EmployeesModule } from './employees/employees.module';
import { HolidaysModule } from './holidays/holidays.module';
import { ScheduleModule } from './schedule/schedule.module';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { DevicesModule } from './devices/devices.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CronModule.forRoot(),
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
    DevicesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
