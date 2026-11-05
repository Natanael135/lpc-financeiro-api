import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { normalizeUnit } from '../common/unit';
import { UploadsService } from './uploads.service';
import {
  cleanLabel,
  isPhotoCategory,
  isValidDate,
  isValidDriveId,
  PhotoContext,
} from './photo-path';

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Recebe a foto (multipart, campo `file`). Campos opcionais para já cair na
   * pasta certa do Drive: `category` (faturamento|sangria|retirada|cofre|atestado),
   * `date` (YYYY-MM-DD), `label` e `unit` (ou ?unit=). Sem eles a foto vai para
   * `_Entrada` e é organizada quando o lançamento for salvo.
   */
  @Post()
  @UseInterceptors(
    // Sem storage definido = memória: o arquivo fica em file.buffer.
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
    @Body('date') date?: string,
    @Body('label') label?: string,
    @Body('unit') bodyUnit?: string,
    @Body('folder') folder?: string,
    @Query('unit') queryUnit?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo ausente.');
    if (
      file.mimetype &&
      !file.mimetype.startsWith('image/') &&
      file.mimetype !== 'application/octet-stream'
    ) {
      throw new BadRequestException('Envie uma imagem.');
    }

    // APK antigo manda folder=atestados para fotos de atestado.
    const cat = category ?? (folder === 'atestados' ? 'atestado' : undefined);
    if (cat !== undefined && !isPhotoCategory(cat)) {
      throw new BadRequestException('Tipo de foto inválido.');
    }
    let ctx: PhotoContext | undefined;
    if (cat && isValidDate(date)) {
      ctx = {
        category: cat,
        date,
        unit: normalizeUnit(bodyUnit ?? queryUnit),
        label: cleanLabel(label) || undefined,
      };
    }

    const url = await this.uploadsService.save(file, ctx);
    return {
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
    };
  }

  /** Entrega a foto guardada no Drive (cache longo: o conteúdo nunca muda). */
  @Get('drive/:id')
  async download(@Param('id') id: string, @Res() res: Response) {
    if (!isValidDriveId(id)) throw new NotFoundException('Foto não encontrada.');
    let file;
    try {
      file = await this.uploadsService.open(id);
    } catch (e) {
      const status = (e as { status?: number; code?: number }).status ??
        (e as { code?: number }).code;
      if (status === 404 || status === 403) {
        throw new NotFoundException('Foto não encontrada.');
      }
      this.logger.error(`Falha ao ler foto ${id}: ${(e as Error).message}`);
      throw e;
    }
    res.setHeader('Content-Type', file.mimeType);
    if (file.size) res.setHeader('Content-Length', String(file.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    file.stream.on('error', (err) => {
      this.logger.error(`Erro no stream da foto ${id}: ${err.message}`);
      res.destroy(err);
    });
    file.stream.pipe(res);
  }
}
