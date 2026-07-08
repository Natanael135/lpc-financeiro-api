import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { PurchaseStatus } from '../schemas/purchase.schema';

export class PurchaseItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class CreatePurchaseDto {
  @IsString()
  @MinLength(1, { message: 'title is required' })
  title: string;

  @IsDateString({ strict: true })
  date: string;

  @IsOptional()
  @IsIn(['pago', 'pendente'])
  status?: PurchaseStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
