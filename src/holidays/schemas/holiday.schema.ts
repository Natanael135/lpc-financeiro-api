import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HolidayDocument = HydratedDocument<Holiday>;

export const HOLIDAY_SCOPES = ['federal', 'estadual', 'municipal'] as const;
export type HolidayScope = (typeof HOLIDAY_SCOPES)[number];

// Feriados valem para a cidade toda (sem unit).
@Schema({ timestamps: true })
export class Holiday {
  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: HOLIDAY_SCOPES })
  scope: HolidayScope;
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);
// Um feriado por dia; a importação ignora datas já existentes.
HolidaySchema.index({ date: 1 }, { unique: true });
