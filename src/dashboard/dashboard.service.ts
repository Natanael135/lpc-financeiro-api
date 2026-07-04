import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import dayjs from 'dayjs';
import { RevenueService } from '../revenue/revenue.service';
import { CashMovementsService } from '../cash-movements/cash-movements.service';
import { CofreReset, CofreResetDocument } from './schemas/cofre-reset.schema';

export interface Attachment {
  url: string;
  filename?: string;
  kind?: string;
}

export interface HistoryEntry {
  reason: string;
  category?: string;
  amount: number;
  attachments: Attachment[];
}

export interface HistoryDay {
  date: string;
  revenue: number;
  revenueAttachments: Attachment[];
  sangrias: HistoryEntry[];
  retiradas: HistoryEntry[];
  sangriaTotal: number;
  retiradaTotal: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly cashMovementsService: CashMovementsService,
    @InjectModel(CofreReset.name)
    private cofreResetModel: Model<CofreResetDocument>,
  ) {}

  private async sumResets(): Promise<number> {
    const result = await this.cofreResetModel.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async getCofreBalance() {
    const [retiradas, resets] = await Promise.all([
      this.cashMovementsService.sumByType('retirada'),
      this.sumResets(),
    ]);
    return { balance: retiradas - resets };
  }

  async resetCofre() {
    const { balance } = await this.getCofreBalance();
    if (balance > 0) {
      await this.cofreResetModel.create({
        amount: balance,
        date: dayjs().format('YYYY-MM-DD'),
      });
    }
    return { balance: 0, zeroedAmount: Math.max(balance, 0) };
  }

  /** Histórico de esvaziamentos do cofre no período. */
  async getCofreResets(start?: string, end?: string) {
    const filter: { date?: { $gte?: string; $lte?: string } } = {};
    if (start || end) {
      filter.date = {};
      if (start) filter.date.$gte = start;
      if (end) filter.date.$lte = end;
    }
    const items = await this.cofreResetModel.find(filter).sort({ createdAt: -1 });
    const total = items.reduce((sum, r) => sum + r.amount, 0);
    return { items, total };
  }

  /** Resumo agregado do período: totais, série de faturamento e sangrias por categoria. */
  async getOverview(start: string, end: string) {
    const [
      revenueTotal,
      sangriaTotal,
      retiradaTotal,
      cofre,
      sangriaByCategory,
      revenues,
    ] = await Promise.all([
      this.revenueService.sumRange(start, end),
      this.cashMovementsService.sumByType('sangria', { start, end }),
      this.cashMovementsService.sumByType('retirada', { start, end }),
      this.getCofreBalance(),
      this.cashMovementsService.breakdownByCategory('sangria', { start, end }),
      this.revenueService.listRange(start, end),
    ]);

    return {
      range: { start, end },
      revenueTotal,
      sangriaTotal,
      retiradaTotal, // dinheiro que foi para o cofre no período
      cofreBalance: cofre.balance,
      sangriaByCategory,
      revenueSeries: revenues.map((r) => ({ date: r.date, amount: r.amount })),
    };
  }

  /** Histórico detalhado agrupado por dia (desc). */
  async getHistory(start: string, end: string): Promise<HistoryDay[]> {
    const [revenues, movementsResult] = await Promise.all([
      this.revenueService.listRange(start, end),
      this.cashMovementsService.findFiltered({ start, end }),
    ]);

    const days = new Map<string, HistoryDay>();
    const ensure = (date: string): HistoryDay => {
      let day = days.get(date);
      if (!day) {
        day = {
          date,
          revenue: 0,
          revenueAttachments: [],
          sangrias: [],
          retiradas: [],
          sangriaTotal: 0,
          retiradaTotal: 0,
        };
        days.set(date, day);
      }
      return day;
    };

    for (const rev of revenues) {
      const day = ensure(rev.date);
      day.revenue = rev.amount;
      day.revenueAttachments = rev.attachments ?? [];
    }
    for (const mov of movementsResult.items) {
      const day = ensure(mov.date);
      const entry: HistoryEntry = {
        reason: mov.reason,
        category: mov.category,
        amount: mov.amount,
        attachments: mov.attachments ?? [],
      };
      if (mov.type === 'sangria') {
        day.sangrias.push(entry);
        day.sangriaTotal += mov.amount;
      } else {
        day.retiradas.push(entry);
        day.retiradaTotal += mov.amount;
      }
    }

    return Array.from(days.values()).sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    );
  }

  async getSummary(date?: string) {
    const targetDate = date ?? dayjs().format('YYYY-MM-DD');
    const [revenue, sangriasTotal, retiradasTotal, cofre] = await Promise.all([
      this.revenueService.findByDate(targetDate),
      this.cashMovementsService.sumByType('sangria', targetDate),
      this.cashMovementsService.sumByType('retirada', targetDate),
      this.getCofreBalance(),
    ]);

    return {
      date: targetDate,
      revenue: revenue?.amount ?? 0,
      sangriasTotal,
      retiradasTotal,
      cofreBalance: cofre.balance,
    };
  }
}
