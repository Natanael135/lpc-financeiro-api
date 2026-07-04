import { IsIn, IsOptional, IsString } from 'class-validator';

export class AttachmentDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsIn(['comprovante', 'maquineta', 'outro'])
  kind?: 'comprovante' | 'maquineta' | 'outro';
}
