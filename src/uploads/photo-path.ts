// Regras de organização das fotos no Google Drive:
//   LPC - Fotos / <Tipo> / <Loja> / <AAAA-MM Mês> / <DD> / "<data> <Tipo> <rótulo> <n>.jpg"
// Ex.: LPC - Fotos/Sangria/Centro/2026-11 Novembro/05/2026-11-05 Sangria Motoboy 1.jpg

export const PHOTO_CATEGORIES = [
  'faturamento',
  'sangria',
  'retirada',
  'cofre',
  'atestado',
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export interface PhotoContext {
  category: PhotoCategory;
  unit: string;
  date: string; // YYYY-MM-DD
  /** Complemento do nome (categoria da sangria, nome do funcionário...). */
  label?: string;
}

export const ROOT_FOLDER_NAME = 'LPC - Fotos';
/** Fotos enviadas sem data/tipo (APK antigo, rotação) até o lançamento ser salvo. */
export const INBOX_FOLDER_NAME = '_Entrada';

const CATEGORY_FOLDER: Record<PhotoCategory, string> = {
  faturamento: 'Faturamento',
  sangria: 'Sangria',
  retirada: 'Retirada',
  cofre: 'Cofre',
  atestado: 'Atestados',
};

const CATEGORY_LABEL: Record<PhotoCategory, string> = {
  faturamento: 'Faturamento',
  sangria: 'Sangria',
  retirada: 'Retirada',
  cofre: 'Cofre',
  atestado: 'Atestado',
};

const UNIT_LABEL: Record<string, string> = {
  shopping: 'Shopping',
  centro: 'Centro',
};

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isPhotoCategory(v: unknown): v is PhotoCategory {
  return (PHOTO_CATEGORIES as readonly unknown[]).includes(v);
}

export function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && DATE_RE.test(v);
}

/** Remove caracteres que atrapalham nomes de arquivo e espaços repetidos. */
export function cleanLabel(v?: string): string {
  return (v ?? '')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function unitLabel(unit: string): string {
  return UNIT_LABEL[unit] ?? cleanLabel(unit.charAt(0).toUpperCase() + unit.slice(1));
}

/** Pastas (abaixo da raiz) onde a foto deve ficar. */
export function folderSegments(ctx: PhotoContext): string[] {
  const [y, m, d] = ctx.date.split('-');
  return [
    CATEGORY_FOLDER[ctx.category],
    unitLabel(ctx.unit),
    `${y}-${m} ${MONTHS[Number(m) - 1]}`,
    d,
  ];
}

/** Início do nome do arquivo; o número sequencial vem depois. */
export function namePrefix(ctx: PhotoContext): string {
  const label = cleanLabel(ctx.label) || unitLabel(ctx.unit);
  return `${ctx.date} ${CATEGORY_LABEL[ctx.category]} ${label}`;
}

/** Extensão segura a partir do nome original / mimetype. */
export function fileExtension(originalName?: string, mimetype?: string): string {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(originalName ?? '')?.[1]?.toLowerCase();
  if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName;
  const fromMime = /^image\/([a-z0-9]+)/i.exec(mimetype ?? '')?.[1]?.toLowerCase();
  if (fromMime) return fromMime === 'jpeg' ? 'jpg' : fromMime;
  return 'jpg';
}

// URL guardada no banco: relativa à API (o app resolve com absoluteUrl()).
const DRIVE_URL_PREFIX = '/uploads/drive/';
const DRIVE_ID_RE = /\/uploads\/drive\/([A-Za-z0-9_-]{10,200})(?:[/?#]|$)/;

export function driveUrl(fileId: string): string {
  return `${DRIVE_URL_PREFIX}${fileId}`;
}

export function driveIdFromUrl(url?: string): string | null {
  return DRIVE_ID_RE.exec(url ?? '')?.[1] ?? null;
}

export function isValidDriveId(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,200}$/.test(id);
}
