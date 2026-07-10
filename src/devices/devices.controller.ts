import { Body, Controller, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IsOptional, IsString, Matches } from 'class-validator';
import { Device, DeviceDocument } from './schemas/device.schema';

class RegisterDeviceDto {
  @IsString()
  @Matches(/^ExponentPushToken\[.+\]$/, {
    message: 'token deve ser um Expo Push Token',
  })
  token: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

@Controller('devices')
export class DevicesController {
  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
  ) {}

  /** Registra (ou renova) o celular para receber notificações. */
  @Post()
  async register(@Body() dto: RegisterDeviceDto) {
    await this.deviceModel.updateOne(
      { token: dto.token },
      { $set: { platform: dto.platform } },
      { upsert: true },
    );
    return { sucesso: true };
  }
}
