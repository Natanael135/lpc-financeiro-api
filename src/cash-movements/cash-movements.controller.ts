import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { QueryCashMovementDto } from './dto/query-cash-movement.dto';

@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  create(@Body() dto: CreateCashMovementDto) {
    return this.cashMovementsService.create(dto);
  }

  @Get()
  findFiltered(@Query() query: QueryCashMovementDto) {
    return this.cashMovementsService.findFiltered(query);
  }
}
