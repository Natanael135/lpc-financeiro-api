import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import dayjs from 'dayjs';
import { Revenue, RevenueDocument } from './schemas/revenue.schema';
import { UpsertRevenueDto } from './dto/upsert-revenue.dto';
import { QueryRevenueDto } from './dto/query-revenue.dto';

@Injectable()
export class RevenueService {
  constructor(
    @InjectModel(Revenue.name) private revenueModel: Model<RevenueDocument>,
  ) {}

  upsert(dto: UpsertRevenueDto) {
    const update: Record<string, unknown> = { $set: { amount: dto.amount } };
    // Acumula comprovantes/maquinetas ao longo dos registros do mesmo dia.
    if (dto.attachments?.length) {
      update.$push = { attachments: { $each: dto.attachments } };
    }
    return this.revenueModel.findOneAndUpdate({ date: dto.date }, update, {
      new: true,
      upsert: true,
    });
  }

  findByDate(date: string) {
    return this.revenueModel.findOne({ date });
  }

  findRange(query: QueryRevenueDto) {
    const today = dayjs().format('YYYY-MM-DD');
    const start = query.start ?? today;
    const end = query.end ?? today;
    return this.listRange(start, end);
  }

  /** Faturamentos no intervalo, ordenados por data crescente. */
  listRange(start: string, end: string) {
    return this.revenueModel
      .find({ date: { $gte: start, $lte: end } })
      .sort({ date: 1 });
  }

  /** Soma do faturamento no intervalo. */
  async sumRange(start: string, end: string): Promise<number> {
    const result = await this.revenueModel.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }
}
