import { IsDateString, IsIn, IsOptional } from 'class-validator';
import type { CashMovementType } from '../schemas/cash-movement.schema';

export class QueryCashMovementDto {
  @IsOptional()
  @IsIn(['sangria', 'retirada'])
  type?: CashMovementType;

  @IsOptional()
  @IsDateString({ strict: true })
  start?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  end?: string;
}
