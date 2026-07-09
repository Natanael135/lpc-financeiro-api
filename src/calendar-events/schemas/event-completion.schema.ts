import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventCompletionDocument = HydratedDocument<EventCompletion>;

// Presença do documento = ocorrência do lembrete marcada como "feita".
@Schema({ timestamps: true })
export class EventCompletion {
  @Prop({ required: true, index: true })
  unit: string;

  @Prop({ type: Types.ObjectId, ref: 'CalendarEvent', required: true })
  eventId: Types.ObjectId;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD da ocorrência
}

export const EventCompletionSchema =
  SchemaFactory.createForClass(EventCompletion);
EventCompletionSchema.index({ eventId: 1, date: 1 }, { unique: true });
EventCompletionSchema.index({ unit: 1, date: 1 });
