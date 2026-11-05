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
import { UploadsService } from '../uploads/uploads.service';
import { cleanChannels, sumChannels } from '../common/channels';
import { normalizeUnit } from '../common/unit';

@Injectable()
export class RevenueService {
  constructor(
    @InjectModel(Revenue.name) private revenueModel: Model<RevenueDocument>,
    private readonly uploads: UploadsService,
  ) {}

  async upsert(dto: UpsertRevenueDto, unit: string) {
    // Registros parciais do mesmo dia se acumulam: o valor é somado ao já
    // lançado, nunca substituído. Para corrigir um valor, use o PATCH /:id.
    // Com balcão/delivery, o total é a soma deles e cada canal também acumula.
    const channels = cleanChannels(dto.channels as Record<string, unknown>);
    const inc: Record<string, number> = {
      amount: dto.channels ? sumChannels(channels) : dto.amount,
    };
    for (const [k, v] of Object.entries(channels)) inc[`channels.${k}`] = v;
    const update: Record<string, unknown> = { $inc: inc };
    // Acumula comprovantes/maquinetas ao longo dos registros do mesmo dia.
    if (dto.attachments?.length) {
      update.$push = { attachments: { $each: dto.attachments } };
    }
    const saved = await this.revenueModel.findOneAndUpdate(
      { unit, date: dto.date },
      update,
      { new: true, upsert: true },
    );
    this.uploads.organize(dto.attachments, {
      category: 'faturamento',
      unit,
      date: dto.date,
    });
    return saved;
  }

  findByDate(date: string, unit: string) {
    return this.revenueModel.findOne({ unit, date });
  }

  async update(id: string, dto: UpdateRevenueDto, unit: string) {
    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    if (dto.channels !== undefined) {
      const channels = cleanChannels(dto.channels as Record<string, unknown>);
      const sum = sumChannels(channels);
      if (sum > 0) set.channels = channels;
      else unset.channels = '';
      // O total nunca fica menor que balcão + delivery.
      set.amount = Math.max(dto.amount ?? sum, sum);
    } else if (dto.amount !== undefined) {
      set.amount = dto.amount;
    }
    if (dto.date !== undefined) set.date = dto.date;
    if (dto.attachments !== undefined) set.attachments = dto.attachments;

    let updated: RevenueDocument | null;
    try {
      updated = await this.revenueModel.findOneAndUpdate(
        { _id: id, unit },
        Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set },
        { new: true },
      );
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new BadRequestException('Já existe faturamento nessa data.');
      }
      throw e;
    }
    if (!updated) throw new NotFoundException('Faturamento não encontrado.');

    const target = dto.unit ? normalizeUnit(dto.unit) : unit;
    if (target !== unit) return this.moveToUnit(updated, target);

    if (dto.date !== undefined || dto.attachments !== undefined) {
      this.uploads.organize(updated.attachments, {
        category: 'faturamento',
        unit,
        date: updated.date,
      });
    }
    return updated;
  }

  /**
   * Passa o faturamento do dia para outra loja. Se a outra loja já tiver
   * faturamento nessa data, os valores (e fotos) são somados nele.
   */
  private async moveToUnit(source: RevenueDocument, target: string) {
    const existing = await this.revenueModel.findOne({
      unit: target,
      date: source.date,
    });

    let result: RevenueDocument | null;
    if (!existing) {
      result = await this.revenueModel.findOneAndUpdate(
        { _id: source._id },
        { $set: { unit: target } },
        { new: true },
      );
    } else {
      const inc: Record<string, number> = { amount: source.amount };
      for (const [k, v] of Object.entries(cleanChannels(source.channels))) {
        inc[`channels.${k}`] = v;
      }
      const update: Record<string, unknown> = { $inc: inc };
      if (source.attachments?.length) {
        update.$push = { attachments: { $each: source.attachments } };
      }
      result = await this.revenueModel.findOneAndUpdate(
        { _id: existing._id },
        update,
        { new: true },
      );
      await this.revenueModel.deleteOne({ _id: source._id });
    }

    this.uploads.organize(result?.attachments, {
      category: 'faturamento',
      unit: target,
      date: source.date,
    });
    return result;
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
