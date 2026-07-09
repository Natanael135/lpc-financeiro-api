import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  Matches,
} from 'class-validator';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class GenerateScheduleDto {
  @IsMongoId()
  employeeId: string;

  @Matches(DATE_REGEX, { message: 'start deve ser YYYY-MM-DD' })
  start: string;

  @Matches(DATE_REGEX, { message: 'end deve ser YYYY-MM-DD' })
  end: string;

  // Domingos de folga escolhidos pelo usuário: exatamente 1 por mês do período.
  @IsArray()
  @Matches(DATE_REGEX, { each: true, message: 'sundaysOff deve ser YYYY-MM-DD' })
  sundaysOff: string[];

  // true: sobrescreve também dias editados manualmente.
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
