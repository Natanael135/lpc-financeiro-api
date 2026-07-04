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
  @Prop({ required: true, unique: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, min: 0 })
  amount: number;

  // Comprovantes / fotos das maquinetas do faturamento.
  @Prop({ type: [{ url: String, filename: String, kind: String }], default: [] })
  attachments: Attachment[];
}

export const RevenueSchema = SchemaFactory.createForClass(Revenue);
