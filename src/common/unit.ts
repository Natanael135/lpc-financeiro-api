export const UNITS = ['shopping', 'centro'] as const;
export type Unit = (typeof UNITS)[number];
export const DEFAULT_UNIT: Unit = 'shopping';

/** Normaliza o parâmetro de unidade vindo da requisição (default: shopping). */
export function normalizeUnit(u?: string): Unit {
  return (UNITS as readonly string[]).includes(u ?? '')
    ? (u as Unit)
    : DEFAULT_UNIT;
}
