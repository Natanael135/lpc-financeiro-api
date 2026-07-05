import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CofreDepositDocument = HydratedDocument<CofreDeposit>;

/** Aporte direto ao cofre (ex.: dinheiro vindo de outro estabelecimento). */
@Schema({ timestamps: true })
export class CofreDeposit {
  @Prop({ required: true, index: true, default: 'shopping' })
  unit: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD — dia em que o valor foi adicionado

  @Prop({ trim: true, default: '' })
  note: string; // origem / observação

  @Prop({ type: [{ url: String, filename: String, kind: String }], default: [] })
  attachments: { url: string; filename?: string; kind?: string }[];
}

export const CofreDepositSchema = SchemaFactory.createForClass(CofreDeposit);
