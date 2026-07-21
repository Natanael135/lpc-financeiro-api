import { IsIn, IsOptional, IsString } from 'class-validator';

export class AttachmentDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsIn(['comprovante', 'maquineta', 'atestado', 'outro'])
  kind?: 'comprovante' | 'maquineta' | 'atestado' | 'outro';
}
