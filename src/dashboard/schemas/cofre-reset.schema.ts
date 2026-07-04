import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CofreResetDocument = HydratedDocument<CofreReset>;

@Schema({ timestamps: true })
export class CofreReset {
  @Prop({ required: true, min: 0 })
  amount: number; // valor que estava no cofre no momento do reset

  @Prop({ required: true })
  date: string; // YYYY-MM-DD
}

export const CofreResetSchema = SchemaFactory.createForClass(CofreReset);
