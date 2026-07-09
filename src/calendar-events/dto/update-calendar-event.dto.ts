import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
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
import { COLOR_REGEX, DATE_REGEX } from './create-calendar-event.dto';

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsIn(RECURRENCES)
  recurrence?: Recurrence;

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

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
