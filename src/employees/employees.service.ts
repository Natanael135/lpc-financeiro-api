import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { DayJourneyDto } from './dto/day-journey.dto';
import { minutesOf } from '../common/week';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  list(unit: string, includeInactive = false) {
    const filter: Record<string, unknown> = { unit };
    if (!includeInactive) filter.active = true;
    return this.employeeModel.find(filter).sort({ name: 1 });
  }

  create(dto: CreateEmployeeDto, unit: string) {
    this.assertSchedule(dto.week, dto.defaultStart, dto.defaultEnd);
    return this.employeeModel.create({ ...dto, unit, active: true });
  }

  async update(id: string, dto: UpdateEmployeeDto, unit: string) {
    const current = await this.employeeModel.findOne({ _id: id, unit });
    if (!current) throw new NotFoundException('Funcionário não encontrado.');

    // Valida a jornada resultante (o que vier no dto, senão o que já existe).
    const week = dto.week ?? current.week;
    const start = dto.defaultStart ?? current.defaultStart;
    const end = dto.defaultEnd ?? current.defaultEnd;
    this.assertSchedule(week, start, end);

    const updated = await this.employeeModel.findOneAndUpdate(
      { _id: id, unit },
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Funcionário não encontrado.');
    return updated;
  }

  /** Soft delete: mantém o histórico da escala. */
  async remove(id: string, unit: string) {
    const updated = await this.employeeModel.findOneAndUpdate(
      { _id: id, unit },
      { $set: { active: false } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Funcionário não encontrado.');
    return { sucesso: true };
  }

  /** Valida a jornada por dia da semana ou, na sua falta, a jornada legada. */
  private assertSchedule(
    week: DayJourneyDto[] | undefined,
    legacyStart?: string,
    legacyEnd?: string,
  ) {
    if (week && week.length) {
      const working = week.filter((d) => !d.off);
      if (working.length === 0) {
        throw new BadRequestException(
          'A jornada precisa de pelo menos um dia de trabalho.',
        );
      }
      for (const d of working) {
        if (!d.start || !d.end) {
          throw new BadRequestException(
            'Dia de trabalho precisa de entrada e saída.',
          );
        }
        if (d.end <= d.start) {
          throw new BadRequestException(
            'Horário de saída deve ser depois do de entrada.',
          );
        }
        if (minutesOf(d.end) - minutesOf(d.start) <= (d.breakMinutes ?? 0)) {
          throw new BadRequestException(
            'Intervalo maior que o próprio expediente.',
          );
        }
      }
      return;
    }
    // Caminho legado (jornada única).
    if (legacyStart && legacyEnd && legacyEnd <= legacyStart) {
      throw new BadRequestException(
        'Horário de saída deve ser depois do de entrada.',
      );
    }
  }
}
