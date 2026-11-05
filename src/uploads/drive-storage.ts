// Acesso ao Google Drive da conta da loja (OAuth com refresh token, escopo
// drive.file: o app só enxerga as pastas/arquivos que ele mesmo criou).
// Classe sem dependência do Nest para ser reaproveitada pelos scripts.
import { auth, drive, drive_v3 } from '@googleapis/drive';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  folderSegments,
  INBOX_FOLDER_NAME,
  namePrefix,
  PhotoContext,
  ROOT_FOLDER_NAME,
} from './photo-path';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

export interface DriveStorageConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Opcional: ID fixo da pasta raiz (senão procura/cria "LPC - Fotos"). */
  rootFolderId?: string;
}

export interface DriveFileStream {
  stream: Readable;
  mimeType: string;
  size?: number;
}

function escapeQuery(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined;
  const h = headers as { get?: (n: string) => string | null } & Record<string, unknown>;
  if (typeof h.get === 'function') return h.get(name) ?? undefined;
  const v = h[name];
  return typeof v === 'string' ? v : undefined;
}

export class DriveStorage {
  private readonly drive: drive_v3.Drive;
  private readonly folderCache = new Map<string, string>();
  private readonly locks = new Map<string, Promise<unknown>>();
  private rootId?: string;

  constructor(cfg: DriveStorageConfig) {
    const client = new auth.OAuth2(cfg.clientId, cfg.clientSecret);
    client.setCredentials({ refresh_token: cfg.refreshToken });
    this.drive = drive({ version: 'v3', auth: client });
    this.rootId = cfg.rootFolderId || undefined;
  }

  /** Executa `fn` em fila por chave (evita pastas duplicadas e números repetidos). */
  private withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(fn);
    const tail = run.catch(() => undefined);
    this.locks.set(key, tail);
    void tail.then(() => {
      if (this.locks.get(key) === tail) this.locks.delete(key);
    });
    return run;
  }

  private async childFolder(parentId: string, name: string): Promise<string> {
    const key = `${parentId}/${name}`;
    const cached = this.folderCache.get(key);
    if (cached) return cached;
    return this.withLock('folders', async () => {
      const again = this.folderCache.get(key);
      if (again) return again;
      const res = await this.drive.files.list({
        q: `mimeType='${FOLDER_MIME}' and name='${escapeQuery(name)}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id)',
        pageSize: 1,
        spaces: 'drive',
      });
      let id = res.data.files?.[0]?.id ?? undefined;
      if (!id) {
        const created = await this.drive.files.create({
          requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
          fields: 'id',
        });
        id = created.data.id!;
      }
      this.folderCache.set(key, id);
      return id;
    });
  }

  async root(): Promise<string> {
    if (!this.rootId) this.rootId = await this.childFolder('root', ROOT_FOLDER_NAME);
    return this.rootId;
  }

  async folderPath(segments: string[]): Promise<string> {
    let parent = await this.root();
    for (const s of segments) parent = await this.childFolder(parent, s);
    return parent;
  }

  /** Próximo nome livre: "<prefixo> 1.jpg", "<prefixo> 2.jpg"... */
  private async nextName(folderId: string, prefix: string, ext: string): Promise<string> {
    const names: string[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false and name contains '${escapeQuery(prefix)}'`,
        fields: 'nextPageToken, files(name)',
        pageSize: 1000,
        pageToken,
        spaces: 'drive',
      });
      for (const f of res.data.files ?? []) if (f.name) names.push(f.name);
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    let max = 0;
    for (const name of names) {
      if (!name.startsWith(`${prefix} `)) continue;
      const n = /^(\d+)(?:\.|$)/.exec(name.slice(prefix.length + 1))?.[1];
      if (n) max = Math.max(max, Number(n));
    }
    return `${prefix} ${max + 1}.${ext}`;
  }

  /** Sobe a foto já na pasta certa (ou em _Entrada, sem contexto). Devolve o fileId. */
  async uploadPhoto(
    buffer: Buffer,
    mimeType: string,
    ext: string,
    ctx?: PhotoContext,
  ): Promise<string> {
    const create = async (folderId: string, name: string) => {
      const res = await this.drive.files.create({
        requestBody: { name, parents: [folderId] },
        media: { mimeType, body: Readable.from(buffer) },
        fields: 'id',
      });
      return res.data.id!;
    };

    if (!ctx) {
      const inbox = await this.folderPath([INBOX_FOLDER_NAME]);
      return create(inbox, `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`);
    }

    const folderId = await this.folderPath(folderSegments(ctx));
    return this.withLock(`files:${folderId}`, async () =>
      create(folderId, await this.nextName(folderId, namePrefix(ctx), ext)),
    );
  }

  /**
   * Garante que um arquivo já enviado esteja na pasta/nome do lançamento
   * (data/loja/tipo podem mudar depois do upload). Devolve true se moveu.
   */
  async place(fileId: string, ctx: PhotoContext): Promise<boolean> {
    const prefix = namePrefix(ctx);
    const [meta, folderId] = await Promise.all([
      this.drive.files.get({ fileId, fields: 'id, name, parents' }),
      this.folderPath(folderSegments(ctx)),
    ]);
    const name = meta.data.name ?? '';
    const parents = meta.data.parents ?? [];
    if (parents.includes(folderId) && name.startsWith(`${prefix} `)) return false;

    const ext = /\.([a-z0-9]{2,5})$/i.exec(name)?.[1]?.toLowerCase() ?? 'jpg';
    await this.withLock(`files:${folderId}`, async () => {
      const newName = await this.nextName(folderId, prefix, ext);
      await this.drive.files.update({
        fileId,
        addParents: parents.includes(folderId) ? undefined : folderId,
        removeParents: parents.filter((p) => p !== folderId).join(',') || undefined,
        requestBody: { name: newName },
        fields: 'id',
      });
    });
    return true;
  }

  /** Conteúdo do arquivo para servir pela API. */
  async open(fileId: string): Promise<DriveFileStream> {
    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
    const len = headerValue(res.headers, 'content-length');
    return {
      stream: res.data as unknown as Readable,
      mimeType: headerValue(res.headers, 'content-type') ?? 'application/octet-stream',
      size: len ? Number(len) : undefined,
    };
  }
}
