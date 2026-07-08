import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PurchaseStatus = 'pago' | 'pendente';

export type PurchaseDocument = HydratedDocument<Purchase>;

/** Lista de compras (ex.: Comercial Bahia, refrigerante, gordura). */
@Schema({ timestamps: true })
export class Purchase {
  // Título da lista (ex.: "Comercial Bahia", "Compras da semana").
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, enum: ['pago', 'pendente'], default: 'pendente', index: true })
  status: PurchaseStatus;

  // Valor total da compra (opcional).
  @Prop({ min: 0 })
  total?: number;

  @Prop({
    type: [{ name: String, quantity: Number }],
    default: [],
  })
  items: { name: string; quantity: number }[];
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
