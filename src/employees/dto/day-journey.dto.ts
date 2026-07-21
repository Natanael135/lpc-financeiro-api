import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TIME_REGEX } from './create-employee.dto';

export class DayJourneyDto {
  @IsBoolean()
  off: boolean;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'start deve ser HH:mm' })
  start?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'end deve ser HH:mm' })
  end?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  breakMinutes?: number;
}
