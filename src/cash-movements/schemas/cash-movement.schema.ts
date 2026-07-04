import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CashMovementType = 'sangria' | 'retirada';

export type CashMovementDocument = HydratedDocument<CashMovement>;

@Schema({ timestamps: true })
export class CashMovement {
  @Prop({ required: true, enum: ['sangria', 'retirada'] })
  type: CashMovementType;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, trim: true })
  reason: string;

  // Categoria da sangria (ex.: Motoboy, Fornecedor, Insumos). Padrão "Outros".
  @Prop({ trim: true, default: 'Outros', index: true })
  category: string;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD

  // Comprovantes/fotos da sangria ou retirada.
  @Prop({ type: [{ url: String, filename: String, kind: String }], default: [] })
  attachments: { url: string; filename?: string; kind?: string }[];
}

export const CashMovementSchema = SchemaFactory.createForClass(CashMovement);
