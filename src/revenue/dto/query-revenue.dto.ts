import { IsOptional, IsDateString } from 'class-validator';

export class QueryRevenueDto {
  @IsOptional()
  @IsDateString({ strict: true })
  start?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  end?: string;
}
