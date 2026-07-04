import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
    }
    this.bucket = config.get<string>('SUPABASE_BUCKET') || 'comprovantes';
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** Garante que o bucket existe e é público. */
  async onModuleInit() {
    try {
      const { data } = await this.supabase.storage.getBucket(this.bucket);
      if (!data) {
        const { error } = await this.supabase.storage.createBucket(this.bucket, {
          public: true,
        });
        if (error) throw error;
        this.logger.log(`Bucket "${this.bucket}" criado no Supabase.`);
      }
    } catch (e) {
      this.logger.warn(
        `Não foi possível verificar/criar o bucket "${this.bucket}": ${
          (e as Error).message
        }`,
      );
    }
  }

  /** Envia o arquivo para o Supabase Storage e devolve a URL pública. */
  async save(file: Express.Multer.File): Promise<string> {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) {
      throw new Error(`Falha ao enviar para o Supabase: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
