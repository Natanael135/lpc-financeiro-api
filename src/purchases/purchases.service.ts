import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Purchase,
  PurchaseDocument,
  PurchaseStatus,
} from './schemas/purchase.schema';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

interface PurchaseFilter {
  status?: PurchaseStatus;
  date?: { $gte?: string; $lte?: string };
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase.name)
    private purchaseModel: Model<PurchaseDocument>,
  ) {}

  create(dto: CreatePurchaseDto) {
    return this.purchaseModel.create(dto);
  }

  async findFiltered(query: { status?: PurchaseStatus; start?: string; end?: string }) {
    const filter: PurchaseFilter = {};
    if (query.status) filter.status = query.status;
    if (query.start || query.end) {
      filter.date = {};
      if (query.start) filter.date.$gte = query.start;
      if (query.end) filter.date.$lte = query.end;
    }
    const items = await this.purchaseModel
      .find(filter)
      .sort({ date: -1, createdAt: -1 });
    const total = items.reduce((sum, p) => sum + (p.total ?? 0), 0);
    const pendentes = items.filter((p) => p.status === 'pendente').length;
    return { items, total, pendentes };
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    const updated = await this.purchaseModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Compra não encontrada.');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.purchaseModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Compra não encontrada.');
    return { sucesso: true };
  }
}
