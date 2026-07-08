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
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import type { PurchaseStatus } from './schemas/purchase.schema';

class QueryPurchasesDto {
  @IsOptional()
  @IsIn(['pago', 'pendente'])
  status?: PurchaseStatus;

  @IsOptional()
  @IsDateString({ strict: true })
  start?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  end?: string;
}

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(dto);
  }

  @Get()
  findFiltered(@Query() query: QueryPurchasesDto) {
    return this.purchasesService.findFiltered(query);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }
}
