import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DevicesModule } from '../devices/devices.module';
import { EmployeesModule } from '../employees/employees.module';
import {
  ScheduleEntry,
  ScheduleEntrySchema,
} from '../schedule/schemas/schedule-entry.schema';
import {
  CalendarEvent,
  CalendarEventSchema,
} from '../calendar-events/schemas/calendar-event.schema';
import {
  EventCompletion,
  EventCompletionSchema,
} from '../calendar-events/schemas/event-completion.schema';

@Module({
  imports: [
    DevicesModule,
    EmployeesModule,
    MongooseModule.forFeature([
      { name: ScheduleEntry.name, schema: ScheduleEntrySchema },
      { name: CalendarEvent.name, schema: CalendarEventSchema },
      { name: EventCompletion.name, schema: EventCompletionSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
