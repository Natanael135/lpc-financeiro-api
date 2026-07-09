import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScheduleEntryDocument = HydratedDocument<ScheduleEntry>;

export const ENTRY_STATUSES = [
  'work',
  'dayoff',
  'compday',
  'absence',
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

@Schema({ timestamps: true })
export class ScheduleEntry {
  @Prop({ required: true, index: true })
  unit: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, enum: ENTRY_STATUSES })
  status: EntryStatus;

  // Somente quando status='work'.
  @Prop()
  start?: string; // HH:mm

  @Prop()
  end?: string; // HH:mm

  // Tempo extra do dia em minutos (somente status='work').
  @Prop({ min: 0 })
  overtimeMinutes?: number;

  // Intervalo (almoço/descanso) em minutos, descontado das horas
  // trabalhadas sem registrar horário exato. Default 60 (1h).
  @Prop({ min: 0 })
  breakMinutes?: number;

  // 'manual' preserva o dia em regerações sem overwrite.
  @Prop({ required: true, enum: ['generated', 'manual'], default: 'generated' })
  source: 'generated' | 'manual';

  @Prop()
  note?: string;
}

export const ScheduleEntrySchema =
  SchemaFactory.createForClass(ScheduleEntry);
ScheduleEntrySchema.index({ employeeId: 1, date: 1 }, { unique: true });
ScheduleEntrySchema.index({ unit: 1, date: 1 });
