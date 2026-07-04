import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    // Sem storage definido = memória: o arquivo fica em file.buffer.
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.save(file);
    return {
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
    };
  }
}
