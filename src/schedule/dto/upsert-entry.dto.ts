import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ENTRY_STATUSES } from '../schemas/schedule-entry.schema';
import type { EntryStatus } from '../schemas/schedule-entry.schema';
import { DATE_REGEX } from './generate-schedule.dto';

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertEntryDto {
  @IsMongoId()
  employeeId: string;

  @Matches(DATE_REGEX, { message: 'date deve ser YYYY-MM-DD' })
  date: string;

  @IsIn(ENTRY_STATUSES)
  status: EntryStatus;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'start deve ser HH:mm' })
  start?: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'end deve ser HH:mm' })
  end?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  overtimeMinutes?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
