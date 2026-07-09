import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ timestamps: true })
export class Employee {
  // Unidade/estabelecimento (ex.: shopping, centro).
  @Prop({ required: true, index: true, default: 'shopping' })
  unit: string;

  @Prop({ required: true })
  name: string;

  // Cor de identificação no calendário (hex #RRGGBB).
  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  defaultStart: string; // HH:mm

  @Prop({ required: true })
  defaultEnd: string; // HH:mm

  // Dia fixo de folga semanal (0=domingo .. 6=sábado).
  @Prop({ required: true, min: 0, max: 6 })
  weeklyDayOff: number;

  // Soft delete: preserva o histórico de escala do funcionário.
  @Prop({ default: true, index: true })
  active: boolean;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index({ unit: 1, active: 1 });
