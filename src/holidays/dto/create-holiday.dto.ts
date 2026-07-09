import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';
import { HOLIDAY_SCOPES } from '../schemas/holiday.schema';
import type { HolidayScope } from '../schemas/holiday.schema';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateHolidayDto {
  @Matches(DATE_REGEX, { message: 'date deve ser YYYY-MM-DD' })
  date: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(HOLIDAY_SCOPES)
  scope: HolidayScope;
}
