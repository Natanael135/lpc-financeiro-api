import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

// Subpastas permitidas dentro do bucket (comprovantes ficam na raiz).
const ALLOWED_FOLDERS = ['atestados'];

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    // Sem storage definido = memória: o arquivo fica em file.buffer.
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (folder && !ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException('Pasta inválida.');
    }
    const url = await this.uploadsService.save(file, folder);
    return {
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
    };
  }
}
