import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttachmentDto } from '../../common/dto/attachment.dto';
import { UNITS } from '../../common/unit';
import { ChannelsDto } from './channels.dto';

export class UpdateRevenueDto {
  /**
   * Total do dia. Com `channels`, nunca fica menor que a soma deles (a
   * diferença é a parte "sem separação" de lançamentos antigos).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelsDto)
  channels?: ChannelsDto;

  @IsOptional()
  @IsDateString({ strict: true })
  date?: string;

  /** Move o faturamento para outra loja (soma se ela já tiver o dia). */
  @IsOptional()
  @IsIn(UNITS as unknown as string[])
  unit?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
