import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarEventsController } from './calendar-events.controller';
import { CalendarEventsService } from './calendar-events.service';
import {
  CalendarEvent,
  CalendarEventSchema,
} from './schemas/calendar-event.schema';
import {
  EventCompletion,
  EventCompletionSchema,
} from './schemas/event-completion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalendarEvent.name, schema: CalendarEventSchema },
      { name: EventCompletion.name, schema: EventCompletionSchema },
    ]),
  ],
  controllers: [CalendarEventsController],
  providers: [CalendarEventsService],
})
export class CalendarEventsModule {}
