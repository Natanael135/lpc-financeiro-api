import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsDateString, IsOptional } from 'class-validator';
import dayjs from 'dayjs';
import { DashboardService } from './dashboard.service';
import { CreateCofreDepositDto } from './dto/create-cofre-deposit.dto';
import { normalizeUnit } from '../common/unit';

class SummaryQueryDto {
  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;
}

class RangeQueryDto {
  @IsOptional()
  @IsDateString({ strict: true })
  start?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  end?: string;
}

function resolveRange(query: RangeQueryDto) {
  const start = query.start ?? dayjs().startOf('month').format('YYYY-MM-DD');
  const end = query.end ?? dayjs().endOf('month').format('YYYY-MM-DD');
  return { start, end };
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query() query: SummaryQueryDto, @Query('unit') unit?: string) {
    return this.dashboardService.getSummary(normalizeUnit(unit), query.date);
  }

  @Get('overview')
  getOverview(@Query() query: RangeQueryDto, @Query('unit') unit?: string) {
    const { start, end } = resolveRange(query);
    return this.dashboardService.getOverview(normalizeUnit(unit), start, end);
  }

  @Get('history')
  getHistory(@Query() query: RangeQueryDto, @Query('unit') unit?: string) {
    const { start, end } = resolveRange(query);
    return this.dashboardService.getHistory(normalizeUnit(unit), start, end);
  }

  @Get('cofre')
  getCofre(@Query('unit') unit?: string) {
    return this.dashboardService.getCofreBalance(normalizeUnit(unit));
  }

  @Get('cofre/resets')
  getCofreResets(@Query() query: RangeQueryDto, @Query('unit') unit?: string) {
    return this.dashboardService.getCofreResets(
      normalizeUnit(unit),
      query.start,
      query.end,
    );
  }

  @Post('cofre/reset')
  resetCofre(@Query('unit') unit?: string) {
    return this.dashboardService.resetCofre(normalizeUnit(unit));
  }

  @Get('cofre/deposits')
  getCofreDeposits(@Query() query: RangeQueryDto, @Query('unit') unit?: string) {
    return this.dashboardService.getCofreDeposits(
      normalizeUnit(unit),
      query.start,
      query.end,
    );
  }

  @Post('cofre/deposits')
  createCofreDeposit(
    @Body() dto: CreateCofreDepositDto,
    @Query('unit') unit?: string,
  ) {
    return this.dashboardService.createDeposit(dto, normalizeUnit(unit));
  }
}
