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
import { ChannelsDto } from './channels.dto';

export class UpsertRevenueDto {
  @IsDateString({ strict: true }, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  /** Total do lançamento. Com `channels`, é recalculado como a soma deles. */
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelsDto)
  channels?: ChannelsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
