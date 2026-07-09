import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { COLOR_REGEX, TIME_REGEX } from './create-employee.dto';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(COLOR_REGEX, { message: 'color deve ser hex #RRGGBB' })
  color?: string;

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
  @IsBoolean()
  active?: boolean;
}
