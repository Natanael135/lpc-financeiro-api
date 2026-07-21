import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
import { COLOR_REGEX, TIME_REGEX } from './create-employee.dto';
import { DayJourneyDto } from './day-journey.dto';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(COLOR_REGEX, { message: 'color deve ser hex #RRGGBB' })
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DayJourneyDto)
  week?: DayJourneyDto[];

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

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
