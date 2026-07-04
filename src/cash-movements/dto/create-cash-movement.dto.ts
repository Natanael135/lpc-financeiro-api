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
import type { CashMovementType } from '../schemas/cash-movement.schema';
import { AttachmentDto } from '../../common/dto/attachment.dto';

export class CreateCashMovementDto {
  @IsIn(['sangria', 'retirada'])
  type: CashMovementType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MinLength(1, { message: 'reason is required' })
  reason: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsDateString({ strict: true })
  date: string;
}
