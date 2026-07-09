import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { RECURRENCES } from '../schemas/calendar-event.schema';
import type { Recurrence } from '../schemas/calendar-event.schema';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(RECURRENCES)
  recurrence: Recurrence;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'date deve ser YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @Matches(COLOR_REGEX, { message: 'color deve ser hex #RRGGBB' })
  color?: string;
}
