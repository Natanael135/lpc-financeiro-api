import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { UpsertRevenueDto } from './dto/upsert-revenue.dto';
import { QueryRevenueDto } from './dto/query-revenue.dto';

@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post()
  upsert(@Body() dto: UpsertRevenueDto) {
    return this.revenueService.upsert(dto);
  }

  @Get()
  findRange(@Query() query: QueryRevenueDto) {
    return this.revenueService.findRange(query);
  }
}
