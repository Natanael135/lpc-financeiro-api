import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { HOLIDAY_SCOPES } from '../schemas/holiday.schema';
import type { HolidayScope } from '../schemas/holiday.schema';
import { DATE_REGEX } from './create-holiday.dto';

export class UpdateHolidayDto {
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'date deve ser YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(HOLIDAY_SCOPES)
  scope?: HolidayScope;
}
