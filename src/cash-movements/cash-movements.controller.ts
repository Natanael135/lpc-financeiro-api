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
import { CashMovementsService } from './cash-movements.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { UpdateCashMovementDto } from './dto/update-cash-movement.dto';
import { QueryCashMovementDto } from './dto/query-cash-movement.dto';
import { normalizeUnit } from '../common/unit';

@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  create(@Body() dto: CreateCashMovementDto, @Query('unit') unit?: string) {
    return this.cashMovementsService.create(dto, normalizeUnit(unit));
  }

  @Get()
  findFiltered(@Query() query: QueryCashMovementDto, @Query('unit') unit?: string) {
    return this.cashMovementsService.findFiltered(query, normalizeUnit(unit));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCashMovementDto,
    @Query('unit') unit?: string,
  ) {
    return this.cashMovementsService.update(id, dto, normalizeUnit(unit));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('unit') unit?: string) {
    return this.cashMovementsService.remove(id, normalizeUnit(unit));
  }
}
