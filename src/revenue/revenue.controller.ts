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
import dayjs from 'dayjs';
import { RevenueService } from './revenue.service';
import { UpsertRevenueDto } from './dto/upsert-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { QueryRevenueDto } from './dto/query-revenue.dto';
import { normalizeUnit } from '../common/unit';

@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post()
  upsert(@Body() dto: UpsertRevenueDto, @Query('unit') unit?: string) {
    return this.revenueService.upsert(dto, normalizeUnit(unit));
  }

  @Get()
  findRange(@Query() query: QueryRevenueDto, @Query('unit') unit?: string) {
    const today = dayjs().format('YYYY-MM-DD');
    return this.revenueService.listRange(
      query.start ?? today,
      query.end ?? today,
      normalizeUnit(unit),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRevenueDto,
    @Query('unit') unit?: string,
  ) {
    return this.revenueService.update(id, dto, normalizeUnit(unit));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('unit') unit?: string) {
    return this.revenueService.remove(id, normalizeUnit(unit));
  }
}
