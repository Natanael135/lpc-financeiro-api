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
    this.assertInterval(dto.defaultStart, dto.defaultEnd);
    return this.employeeModel.create({ ...dto, unit, active: true });
  }

  async update(id: string, dto: UpdateEmployeeDto, unit: string) {
    const current = await this.employeeModel.findOne({ _id: id, unit });
    if (!current) throw new NotFoundException('Funcionário não encontrado.');

    const start = dto.defaultStart ?? current.defaultStart;
    const end = dto.defaultEnd ?? current.defaultEnd;
    this.assertInterval(start, end);

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

  private assertInterval(start: string, end: string) {
    if (end <= start) {
      throw new BadRequestException(
        'Horário de saída deve ser depois do de entrada.',
      );
    }
  }
}
