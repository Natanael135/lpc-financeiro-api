import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { normalizeUnit } from '../common/unit';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  list(
    @Query('unit') unit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.employeesService.list(
      normalizeUnit(unit),
      includeInactive === 'true',
    );
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto, @Query('unit') unit?: string) {
    return this.employeesService.create(dto, normalizeUnit(unit));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Query('unit') unit?: string,
  ) {
    return this.employeesService.update(id, dto, normalizeUnit(unit));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('unit') unit?: string) {
    return this.employeesService.remove(id, normalizeUnit(unit));
  }
}
