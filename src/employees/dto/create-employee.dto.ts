import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayJourneyDto } from './day-journey.dto';

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(COLOR_REGEX, { message: 'color deve ser hex #RRGGBB' })
  color: string;

  // Jornada por dia da semana (7 itens, 0=domingo .. 6=sábado).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayJourneyDto)
  week?: DayJourneyDto[];

  // ─── Legado (aceito para compatibilidade; use `week` no app novo) ──
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'defaultStart deve ser HH:mm' })
  defaultStart?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'defaultEnd deve ser HH:mm' })
  defaultEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weeklyDayOff?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  defaultBreakMinutes?: number;
}
