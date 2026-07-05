import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RevenueDocument = HydratedDocument<Revenue>;

export interface Attachment {
  url: string;
  filename?: string;
  kind?: 'comprovante' | 'maquineta' | 'outro';
}

@Schema({ timestamps: true })
export class Revenue {
  // Unidade/estabelecimento (ex.: shopping, centro).
  @Prop({ required: true, index: true, default: 'shopping' })
  unit: string;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, min: 0 })
  amount: number;

  // Comprovantes / fotos das maquinetas do faturamento.
  @Prop({ type: [{ url: String, filename: String, kind: String }], default: [] })
  attachments: Attachment[];
}

export const RevenueSchema = SchemaFactory.createForClass(Revenue);
// Faturamento é único por (unidade, dia).
RevenueSchema.index({ unit: 1, date: 1 }, { unique: true });
