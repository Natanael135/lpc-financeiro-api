// Canais do faturamento: balcão (venda na loja) e delivery.
export const REVENUE_CHANNELS = ['balcao', 'delivery'] as const;
export type RevenueChannel = (typeof REVENUE_CHANNELS)[number];
export type Channels = Partial<Record<RevenueChannel, number>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Mantém só canais conhecidos com valor > 0 (arredondado em centavos). */
export function cleanChannels(c?: Record<string, unknown> | null): Channels {
  const out: Channels = {};
  if (!c) return out;
  for (const k of REVENUE_CHANNELS) {
    const v = Number(c[k]);
    if (Number.isFinite(v) && v > 0) out[k] = round2(v);
  }
  return out;
}

export function sumChannels(c?: Channels | null): number {
  if (!c) return 0;
  return round2(REVENUE_CHANNELS.reduce((s, k) => s + (Number(c[k]) || 0), 0));
}
