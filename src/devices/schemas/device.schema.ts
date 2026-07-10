import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

// Celulares registrados para receber push (Expo Push Token).
@Schema({ timestamps: true })
export class Device {
  @Prop({ required: true })
  token: string; // ExponentPushToken[...]

  @Prop()
  platform?: string; // android | ios
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
DeviceSchema.index({ token: 1 }, { unique: true });
