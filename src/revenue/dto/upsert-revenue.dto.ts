import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttachmentDto } from '../../common/dto/attachment.dto';

export class UpsertRevenueDto {
  @IsDateString({ strict: true }, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
