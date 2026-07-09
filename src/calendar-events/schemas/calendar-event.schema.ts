import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CalendarEventDocument = HydratedDocument<CalendarEvent>;

export const RECURRENCES = ['once', 'weekly', 'monthly'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

// Lembretes do calendário (dia de pedido, contas a pagar etc.).
@Schema({ timestamps: true })
export class CalendarEvent {
  @Prop({ required: true, index: true })
  unit: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: RECURRENCES })
  recurrence: Recurrence;

  // recurrence='once'
  @Prop()
  date?: string; // YYYY-MM-DD

  // recurrence='weekly' (0=domingo .. 6=sábado)
  @Prop({ type: [Number] })
  daysOfWeek?: number[];

  // recurrence='monthly' (1–31; mês sem o dia → ocorrência pula)
  @Prop({ min: 1, max: 31 })
  dayOfMonth?: number;

  @Prop({ default: '#0A84FF' })
  color: string;

  @Prop({ default: true, index: true })
  active: boolean;
}

export const CalendarEventSchema =
  SchemaFactory.createForClass(CalendarEvent);
CalendarEventSchema.index({ unit: 1, active: 1 });
