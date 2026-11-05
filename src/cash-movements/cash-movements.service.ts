import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CashMovement,
  CashMovementDocument,
  CashMovementType,
} from './schemas/cash-movement.schema';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { UpdateCashMovementDto } from './dto/update-cash-movement.dto';
import { QueryCashMovementDto } from './dto/query-cash-movement.dto';
import { UploadsService } from '../uploads/uploads.service';
import { normalizeUnit } from '../common/unit';

export interface DateRange {
  start?: string;
  end?: string;
}

type CashMovementFilter = {
  unit: string;
  type?: CashMovementType;
  category?: string;
  date?: string | { $gte?: string; $lte?: string };
};

@Injectable()
export class CashMovementsService {
  constructor(
    @InjectModel(CashMovement.name)
    private cashMovementModel: Model<CashMovementDocument>,
    private readonly uploads: UploadsService,
  ) {}

  /** Organiza as fotos no Drive: Sangria/Retirada › loja › mês › dia. */
  private organizePhotos(mov: CashMovementDocument) {
    this.uploads.organize(mov.attachments, {
      category: mov.type,
      unit: mov.unit,
      date: mov.date,
      label: mov.type === 'sangria' ? mov.category : undefined,
    });
  }

  async create(dto: CreateCashMovementDto, unit: string) {
    const created = await this.cashMovementModel.create({ ...dto, unit });
    this.organizePhotos(created);
    return created;
  }

  async update(id: string, dto: UpdateCashMovementDto, unit: string) {
    const set: Record<string, unknown> = {};
    if (dto.amount !== undefined) set.amount = dto.amount;
    if (dto.date !== undefined) set.date = dto.date;
    if (dto.reason !== undefined) set.reason = dto.reason;
    if (dto.category !== undefined) set.category = dto.category;
    if (dto.attachments !== undefined) set.attachments = dto.attachments;
    if (dto.unit !== undefined) set.unit = normalizeUnit(dto.unit);

    const updated = await this.cashMovementModel.findOneAndUpdate(
      { _id: id, unit },
      { $set: set },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Movimentação não encontrada.');
    if (
      dto.date !== undefined ||
      dto.category !== undefined ||
      dto.attachments !== undefined ||
      dto.unit !== undefined
    ) {
      this.organizePhotos(updated);
    }
    return updated;
  }

  async remove(id: string, unit: string) {
    const deleted = await this.cashMovementModel.findOneAndDelete({
      _id: id,
      unit,
    });
    if (!deleted) throw new NotFoundException('Movimentação não encontrada.');
    return { sucesso: true };
  }

  private applyRange(filter: CashMovementFilter, range?: DateRange) {
    if (range && (range.start || range.end)) {
      const dateFilter: { $gte?: string; $lte?: string } = {};
      if (range.start) dateFilter.$gte = range.start;
      if (range.end) dateFilter.$lte = range.end;
      filter.date = dateFilter;
    }
    return filter;
  }

  async findFiltered(query: QueryCashMovementDto, unit: string) {
    const filter: CashMovementFilter = { unit };
    if (query.type) filter.type = query.type;
    this.applyRange(filter, { start: query.start, end: query.end });
    const items = await this.cashMovementModel
      .find(filter)
      .sort({ date: -1, createdAt: -1 });
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return { items, total };
  }

  /** Soma total de um tipo. Aceita data exata ou intervalo. */
  async sumByType(
    type: CashMovementType,
    unit: string,
    range?: DateRange | string,
  ): Promise<number> {
    const filter: CashMovementFilter = { unit, type };
    if (typeof range === 'string') {
      filter.date = range;
    } else {
      this.applyRange(filter, range);
    }
    const result = await this.cashMovementModel.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /** Quebra por categoria (usado para sangrias por período). */
  async breakdownByCategory(
    type: CashMovementType,
    unit: string,
    range?: DateRange,
  ) {
    const filter: CashMovementFilter = { unit, type };
    this.applyRange(filter, range);
    const result = await this.cashMovementModel.aggregate<{
      _id: string;
      total: number;
      count: number;
    }>([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Outros'] },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
    return result.map((r) => ({
      category: r._id,
      total: r.total,
      count: r.count,
    }));
  }
}
