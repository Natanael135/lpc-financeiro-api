import { Controller, Get, Post, Query } from '@nestjs/common';
import { IsDateString, IsOptional } from 'class-validator';
import dayjs from 'dayjs';
import { DashboardService } from './dashboard.service';

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
  getSummary(@Query() query: SummaryQueryDto) {
    return this.dashboardService.getSummary(query.date);
  }

  @Get('overview')
  getOverview(@Query() query: RangeQueryDto) {
    const { start, end } = resolveRange(query);
    return this.dashboardService.getOverview(start, end);
  }

  @Get('history')
  getHistory(@Query() query: RangeQueryDto) {
    const { start, end } = resolveRange(query);
    return this.dashboardService.getHistory(start, end);
  }

  @Get('cofre')
  getCofre() {
    return this.dashboardService.getCofreBalance();
  }

  @Get('cofre/resets')
  getCofreResets(@Query() query: RangeQueryDto) {
    return this.dashboardService.getCofreResets(query.start, query.end);
  }

  @Post('cofre/reset')
  resetCofre() {
    return this.dashboardService.resetCofre();
  }
}
