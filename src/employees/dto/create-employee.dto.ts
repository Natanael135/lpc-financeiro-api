import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(COLOR_REGEX, { message: 'color deve ser hex #RRGGBB' })
  color: string;

  @Matches(TIME_REGEX, { message: 'defaultStart deve ser HH:mm' })
  defaultStart: string;

  @Matches(TIME_REGEX, { message: 'defaultEnd deve ser HH:mm' })
  defaultEnd: string;

  @IsInt()
  @Min(0)
  @Max(6)
  weeklyDayOff: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  defaultBreakMinutes?: number;
}
