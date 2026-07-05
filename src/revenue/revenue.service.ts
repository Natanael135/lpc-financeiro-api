import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Revenue, RevenueDocument } from './schemas/revenue.schema';
import { UpsertRevenueDto } from './dto/upsert-revenue.dto';

@Injectable()
export class RevenueService {
  constructor(
    @InjectModel(Revenue.name) private revenueModel: Model<RevenueDocument>,
  ) {}

  upsert(dto: UpsertRevenueDto, unit: string) {
    const update: Record<string, unknown> = { $set: { amount: dto.amount } };
    // Acumula comprovantes/maquinetas ao longo dos registros do mesmo dia.
    if (dto.attachments?.length) {
      update.$push = { attachments: { $each: dto.attachments } };
    }
    return this.revenueModel.findOneAndUpdate(
      { unit, date: dto.date },
      update,
      { new: true, upsert: true },
    );
  }

  findByDate(date: string, unit: string) {
    return this.revenueModel.findOne({ unit, date });
  }

  /** Faturamentos no intervalo, ordenados por data crescente. */
  listRange(start: string, end: string, unit: string) {
    return this.revenueModel
      .find({ unit, date: { $gte: start, $lte: end } })
      .sort({ date: 1 });
  }

  /** Soma do faturamento no intervalo. */
  async sumRange(start: string, end: string, unit: string): Promise<number> {
    const result = await this.revenueModel.aggregate([
      { $match: { unit, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }
}
