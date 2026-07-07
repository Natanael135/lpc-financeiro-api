import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Revenue, RevenueDocument } from './schemas/revenue.schema';
import { UpsertRevenueDto } from './dto/upsert-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';

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

  async update(id: string, dto: UpdateRevenueDto, unit: string) {
    const set: Record<string, unknown> = {};
    if (dto.amount !== undefined) set.amount = dto.amount;
    if (dto.date !== undefined) set.date = dto.date;
    if (dto.attachments !== undefined) set.attachments = dto.attachments;

    let updated: RevenueDocument | null;
    try {
      updated = await this.revenueModel.findOneAndUpdate(
        { _id: id, unit },
        { $set: set },
        { new: true },
      );
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new BadRequestException('Já existe faturamento nessa data.');
      }
      throw e;
    }
    if (!updated) throw new NotFoundException('Faturamento não encontrado.');
    return updated;
  }

  async remove(id: string, unit: string) {
    const deleted = await this.revenueModel.findOneAndDelete({ _id: id, unit });
    if (!deleted) throw new NotFoundException('Faturamento não encontrado.');
    return { sucesso: true };
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
