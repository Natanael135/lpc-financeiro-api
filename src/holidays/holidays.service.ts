import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import { Holiday, HolidayDocument } from './schemas/holiday.schema';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { SOBRAL_FIXED_HOLIDAYS } from './seed/sobral-holidays';

interface BrasilApiHoliday {
  date: string;
  name: string;
  type: string;
}

@Injectable()
export class HolidaysService {
  constructor(
    @InjectModel(Holiday.name) private holidayModel: Model<HolidayDocument>,
  ) {}

  listRange(start: string, end: string) {
    return this.holidayModel
      .find({ date: { $gte: start, $lte: end } })
      .sort({ date: 1 });
  }

  async create(dto: CreateHolidayDto) {
    try {
      return await this.holidayModel.create(dto);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new ConflictException('Já existe feriado nessa data.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateHolidayDto) {
    let updated: HolidayDocument | null;
    try {
      updated = await this.holidayModel.findByIdAndUpdate(
        id,
        { $set: dto },
        { new: true },
      );
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        throw new ConflictException('Já existe feriado nessa data.');
      }
      throw e;
    }
    if (!updated) throw new NotFoundException('Feriado não encontrado.');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.holidayModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Feriado não encontrado.');
    return { sucesso: true };
  }

  /**
   * Importa federais da BrasilAPI (sem Páscoa, que não é feriado trabalhista)
   * + fixos estaduais/municipais de Sobral. Não sobrescreve edições manuais.
   */
  async importYear(year: number) {
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Ano inválido.');
    }

    let federal: BrasilApiHoliday[];
    try {
      const res = await fetch(
        `https://brasilapi.com.br/api/feriados/v1/${year}`,
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      federal = (await res.json()) as BrasilApiHoliday[];
    } catch (e) {
      throw new BadGatewayException(
        `Falha ao consultar feriados nacionais (BrasilAPI): ${String(e)}`,
      );
    }

    const toImport: Array<Pick<Holiday, 'date' | 'name' | 'scope'>> = [
      ...federal
        .filter((h) => h.name !== 'Páscoa')
        .map((h) => ({ date: h.date, name: h.name, scope: 'federal' as const })),
      ...SOBRAL_FIXED_HOLIDAYS.map((h) => ({
        date: `${year}-${h.monthDay}`,
        name: h.name,
        scope: h.scope,
      })),
    ];

    const ops: AnyBulkWriteOperation<Holiday>[] = toImport.map((h) => ({
      updateOne: {
        filter: { date: h.date },
        update: { $setOnInsert: h },
        upsert: true,
      },
    }));

    const result = await this.holidayModel.bulkWrite(ops);
    const inserted = result.upsertedCount ?? 0;
    return { inserted, skipped: toImport.length - inserted };
  }
}
