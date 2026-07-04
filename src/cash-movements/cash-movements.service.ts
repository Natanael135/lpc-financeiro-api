import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CashMovement,
  CashMovementDocument,
  CashMovementType,
} from './schemas/cash-movement.schema';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { QueryCashMovementDto } from './dto/query-cash-movement.dto';

export interface DateRange {
  start?: string;
  end?: string;
}

type CashMovementFilter = {
  type?: CashMovementType;
  category?: string;
  date?: string | { $gte?: string; $lte?: string };
};

@Injectable()
export class CashMovementsService {
  constructor(
    @InjectModel(CashMovement.name)
    private cashMovementModel: Model<CashMovementDocument>,
  ) {}

  create(dto: CreateCashMovementDto) {
    return this.cashMovementModel.create(dto);
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

  async findFiltered(query: QueryCashMovementDto) {
    const filter: CashMovementFilter = {};
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
    range?: DateRange | string,
  ): Promise<number> {
    const filter: CashMovementFilter = { type };
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
  async breakdownByCategory(type: CashMovementType, range?: DateRange) {
    const filter: CashMovementFilter = { type };
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
