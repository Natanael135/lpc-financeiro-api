import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { ScheduleService } from './schedule.service';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { UpsertEntryDto } from './dto/upsert-entry.dto';
import { normalizeUnit } from '../common/unit';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  list(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('employeeId') employeeId?: string,
    @Query('unit') unit?: string,
  ) {
    const today = dayjs().format('YYYY-MM-DD');
    return this.scheduleService.list(
      normalizeUnit(unit),
      start ?? today,
      end ?? today,
      employeeId,
    );
  }

  @Post('generate')
  generate(@Body() dto: GenerateScheduleDto, @Query('unit') unit?: string) {
    return this.scheduleService.generate(dto, normalizeUnit(unit));
  }

  @Put('entry')
  upsertEntry(@Body() dto: UpsertEntryDto, @Query('unit') unit?: string) {
    return this.scheduleService.upsertEntry(dto, normalizeUnit(unit));
  }

  @Get('summary')
  summary(
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: string,
    @Query('unit') unit?: string,
  ) {
    if (!employeeId) throw new BadRequestException('employeeId é obrigatório.');
    return this.scheduleService.summary(
      normalizeUnit(unit),
      employeeId,
      month ?? dayjs().format('YYYY-MM'),
    );
  }
}
