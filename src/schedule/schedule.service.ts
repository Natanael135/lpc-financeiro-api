import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import { AnyBulkWriteOperation, Model, Types } from 'mongoose';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Holiday, HolidayDocument } from '../holidays/schemas/holiday.schema';
import {
  ScheduleEntry,
  ScheduleEntryDocument,
} from './schemas/schedule-entry.schema';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { UpsertEntryDto } from './dto/upsert-entry.dto';

export interface ScheduleSummary {
  workedDays: number;
  totalHours: number; // horas decimais, sem extras
  overtimeMinutes: number;
  sundaysWorked: number;
  holidaysWorked: number;
  daysOff: number;
  compDays: number;
  absences: number;
  compBalance: number; // acumulado all-time
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Intervalo padrão (1h) descontado de cada dia de trabalho.
export const DEFAULT_BREAK_MINUTES = 60;

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(ScheduleEntry.name)
    private entryModel: Model<ScheduleEntryDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Holiday.name) private holidayModel: Model<HolidayDocument>,
  ) {}

  list(unit: string, start: string, end: string, employeeId?: string) {
    const filter: Record<string, unknown> = {
      unit,
      date: { $gte: start, $lte: end },
    };
    if (employeeId) filter.employeeId = new Types.ObjectId(employeeId);
    return this.entryModel.find(filter).sort({ date: 1 });
  }

  async generate(dto: GenerateScheduleDto, unit: string) {
    const employee = await this.employeeModel.findOne({
      _id: dto.employeeId,
      unit,
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    const start = dayjs(dto.start);
    const end = dayjs(dto.end);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      throw new BadRequestException('Período inválido.');
    }
    if (end.diff(start, 'day') > 366) {
      throw new BadRequestException('Período máximo de 1 ano.');
    }

    this.assertSundaysOff(dto.sundaysOff, dto.start, dto.end);
    const sundaysOff = new Set(dto.sundaysOff);

    const existing = await this.entryModel.find({
      employeeId: employee._id,
      date: { $gte: dto.start, $lte: dto.end },
    });
    const existingByDate = new Map(existing.map((e) => [e.date, e]));

    const ops: AnyBulkWriteOperation<ScheduleEntry>[] = [];
    let created = 0;
    let updated = 0;
    let skippedManual = 0;

    for (
      let day = start;
      !day.isAfter(end, 'day');
      day = day.add(1, 'day')
    ) {
      const date = day.format('YYYY-MM-DD');
      const isOff =
        day.day() === employee.weeklyDayOff || sundaysOff.has(date);

      const desired = isOff
        ? { status: 'dayoff' as const }
        : {
            status: 'work' as const,
            start: employee.defaultStart,
            end: employee.defaultEnd,
            breakMinutes: employee.defaultBreakMinutes ?? DEFAULT_BREAK_MINUTES,
          };

      const current = existingByDate.get(date);
      if (!current) {
        ops.push({
          insertOne: {
            document: {
              unit,
              employeeId: employee._id,
              date,
              source: 'generated',
              ...desired,
            } as ScheduleEntry,
          },
        });
        created += 1;
      } else if (current.source === 'manual' && !dto.overwrite) {
        skippedManual += 1;
      } else {
        ops.push({
          updateOne: {
            filter: { _id: current._id },
            update: {
              $set: { ...desired, source: 'generated' },
              $unset:
                desired.status === 'dayoff'
                  ? {
                      start: '',
                      end: '',
                      overtimeMinutes: '',
                      breakMinutes: '',
                      note: '',
                    }
                  : { overtimeMinutes: '', note: '' },
            },
          },
        });
        updated += 1;
      }
    }

    if (ops.length) await this.entryModel.bulkWrite(ops);
    return { created, updated, skippedManual };
  }

  async upsertEntry(dto: UpsertEntryDto, unit: string) {
    const employee = await this.employeeModel.findOne({
      _id: dto.employeeId,
      unit,
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    if (dto.status === 'work') {
      if (!dto.start || !dto.end) {
        throw new BadRequestException(
          'Dia de trabalho precisa de horário de entrada e saída.',
        );
      }
      if (dto.end <= dto.start) {
        throw new BadRequestException(
          'Horário de saída deve ser depois do de entrada.',
        );
      }
      dto.breakMinutes ??= employee.defaultBreakMinutes ?? DEFAULT_BREAK_MINUTES;
      if (minutesOf(dto.end) - minutesOf(dto.start) <= dto.breakMinutes) {
        throw new BadRequestException(
          'Intervalo maior que o próprio expediente.',
        );
      }
    } else if (dto.start || dto.end || dto.overtimeMinutes || dto.breakMinutes) {
      throw new BadRequestException(
        'Horários, extras e intervalo só valem para dia de trabalho.',
      );
    }

    const set: Record<string, unknown> = {
      unit,
      status: dto.status,
      source: 'manual',
    };
    const unset: Record<string, ''> = {};
    for (const field of [
      'start',
      'end',
      'overtimeMinutes',
      'breakMinutes',
      'note',
    ] as const) {
      if (dto[field] !== undefined) set[field] = dto[field];
      else unset[field] = '';
    }

    return this.entryModel.findOneAndUpdate(
      { employeeId: new Types.ObjectId(dto.employeeId), date: dto.date },
      { $set: set, $unset: unset },
      { new: true, upsert: true },
    );
  }

  async summary(
    unit: string,
    employeeId: string,
    month: string,
  ): Promise<ScheduleSummary> {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month deve ser YYYY-MM.');
    }
    const employee = await this.employeeModel.findOne({
      _id: employeeId,
      unit,
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');

    const monthStart = `${month}-01`;
    const monthEnd = dayjs(monthStart).endOf('month').format('YYYY-MM-DD');

    const [entries, monthHolidays, allHolidayDates] = await Promise.all([
      this.entryModel.find({
        employeeId: employee._id,
        date: { $gte: monthStart, $lte: monthEnd },
      }),
      this.holidayModel.find({ date: { $gte: monthStart, $lte: monthEnd } }),
      this.holidayModel.distinct('date'),
    ]);
    const holidayDates = new Set(monthHolidays.map((h) => h.date));

    const summary: ScheduleSummary = {
      workedDays: 0,
      totalHours: 0,
      overtimeMinutes: 0,
      sundaysWorked: 0,
      holidaysWorked: 0,
      daysOff: 0,
      compDays: 0,
      absences: 0,
      compBalance: 0,
    };

    for (const entry of entries) {
      switch (entry.status) {
        case 'work': {
          summary.workedDays += 1;
          if (entry.start && entry.end) {
            // Horas líquidas: expediente menos o intervalo (default 1h).
            const gross = minutesOf(entry.end) - minutesOf(entry.start);
            const net = gross - (entry.breakMinutes ?? DEFAULT_BREAK_MINUTES);
            summary.totalHours += Math.max(0, net) / 60;
          }
          summary.overtimeMinutes += entry.overtimeMinutes ?? 0;
          if (dayjs(entry.date).day() === 0) summary.sundaysWorked += 1;
          if (holidayDates.has(entry.date)) summary.holidaysWorked += 1;
          break;
        }
        case 'dayoff':
          summary.daysOff += 1;
          break;
        case 'compday':
          summary.compDays += 1;
          break;
        case 'absence':
          summary.absences += 1;
          break;
      }
    }
    summary.totalHours = Math.round(summary.totalHours * 100) / 100;

    // Saldo de folgas a receber (all-time): feriados trabalhados − compensatórias.
    const [credits, debits] = await Promise.all([
      this.entryModel.countDocuments({
        employeeId: employee._id,
        status: 'work',
        date: { $in: allHolidayDates },
      }),
      this.entryModel.countDocuments({
        employeeId: employee._id,
        status: 'compday',
      }),
    ]);
    summary.compBalance = credits - debits;

    return summary;
  }

  /**
   * sundaysOff é opcional (ex.: funcionário cuja folga fixa já é domingo):
   * cada data deve ser domingo dentro do período, no máximo 1 por mês.
   */
  private assertSundaysOff(sundaysOff: string[], start: string, end: string) {
    const byMonth = new Map<string, number>();
    for (const date of sundaysOff) {
      const d = dayjs(date);
      if (!d.isValid() || d.day() !== 0) {
        throw new BadRequestException(`${date} não é um domingo.`);
      }
      if (date < start || date > end) {
        throw new BadRequestException(`${date} está fora do período.`);
      }
      const month = date.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
      if (byMonth.get(month)! > 1) {
        throw new BadRequestException(
          `Mais de um domingo de folga em ${month}.`,
        );
      }
    }
  }
}
