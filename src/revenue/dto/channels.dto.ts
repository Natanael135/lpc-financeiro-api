import { IsNumber, IsOptional, Min } from 'class-validator';

/** Faturamento separado por canal. O total do dia é a soma. */
export class ChannelsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  balcao?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery?: number;
}
