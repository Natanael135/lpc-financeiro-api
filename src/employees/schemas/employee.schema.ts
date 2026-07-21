import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

// Jornada de um dia da semana. Subdocumento sem _id próprio.
@Schema({ _id: false })
export class DayJourney {
  // true = folga fixa nesse dia da semana (start/end/break ficam vazios).
  @Prop({ required: true, default: false })
  off: boolean;

  @Prop()
  start?: string; // HH:mm

  @Prop()
  end?: string; // HH:mm

  @Prop({ min: 0 })
  breakMinutes?: number; // intervalo do dia, descontado das horas
}
export const DayJourneySchema = SchemaFactory.createForClass(DayJourney);

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

  // Jornada por dia da semana (índice 0=domingo .. 6=sábado), sempre 7 itens.
  // Fonte de verdade da escala. Quando ausente (cadastros antigos), a jornada
  // é derivada dos campos legados abaixo — sem migração destrutiva.
  @Prop({ type: [DayJourneySchema] })
  week?: DayJourney[];

  // ─── Campos legados (jornada única) ────────────────────
  // Mantidos como fallback para registros criados antes do `week`.
  @Prop()
  defaultStart?: string; // HH:mm

  @Prop()
  defaultEnd?: string; // HH:mm

  // Dia fixo de folga semanal (0=domingo .. 6=sábado).
  @Prop({ min: 0, max: 6 })
  weeklyDayOff?: number;

  // Intervalo diário padrão em minutos, descontado das horas trabalhadas.
  @Prop({ default: 60, min: 0 })
  defaultBreakMinutes?: number;

  // Soft delete: preserva o histórico de escala do funcionário.
  @Prop({ default: true, index: true })
  active: boolean;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index({ unit: 1, active: 1 });
