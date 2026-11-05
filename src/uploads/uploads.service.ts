import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DriveFileStream, DriveStorage } from './drive-storage';
import {
  driveIdFromUrl,
  driveUrl,
  fileExtension,
  PhotoContext,
} from './photo-path';

/**
 * Fotos (comprovantes, maquinetas, atestados...) ficam no Google Drive da
 * conta da loja, organizadas por Tipo › Loja › Mês › Dia. No banco guardamos
 * só a URL relativa `/uploads/drive/<fileId>`, servida pela própria API.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly storage?: DriveStorage;

  constructor(config: ConfigService) {
    const clientId = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    const refreshToken = config.get<string>('GOOGLE_REFRESH_TOKEN');
    if (clientId && clientSecret && refreshToken) {
      this.storage = new DriveStorage({
        clientId,
        clientSecret,
        refreshToken,
        rootFolderId: config.get<string>('GOOGLE_DRIVE_ROOT_ID'),
      });
    } else {
      // Não derruba a API inteira: só o upload/leitura de fotos fica indisponível.
      this.logger.error(
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN são obrigatórios para as fotos.',
      );
    }
  }

  private get drive(): DriveStorage {
    if (!this.storage) {
      throw new ServiceUnavailableException('Armazenamento de fotos não configurado.');
    }
    return this.storage;
  }

  /** Envia a foto para o Drive e devolve a URL a guardar no lançamento. */
  async save(file: Express.Multer.File, ctx?: PhotoContext): Promise<string> {
    const ext = fileExtension(file.originalname, file.mimetype);
    const id = await this.drive.uploadPhoto(
      file.buffer,
      file.mimetype || 'image/jpeg',
      ext,
      ctx,
    );
    return driveUrl(id);
  }

  open(fileId: string): Promise<DriveFileStream> {
    return this.drive.open(fileId);
  }

  /**
   * Depois que um lançamento é salvo/editado, move as fotos dele para a pasta
   * e nome corretos (cobre APK antigo, rotação de foto e troca de data).
   * Roda em segundo plano: nunca atrasa nem derruba o salvamento.
   */
  organize(attachments: { url?: string }[] | undefined, ctx: PhotoContext): void {
    if (!this.storage || !attachments?.length) return;
    const ids = attachments
      .map((a) => driveIdFromUrl(a.url))
      .filter((id): id is string => !!id);
    if (!ids.length) return;
    void (async () => {
      for (const id of ids) {
        try {
          await this.storage!.place(id, ctx);
        } catch (e) {
          this.logger.warn(
            `Não foi possível organizar a foto ${id}: ${(e as Error).message}`,
          );
        }
      }
    })();
  }
}
