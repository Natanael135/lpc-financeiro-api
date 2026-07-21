// Jornada por dia da semana (índice 0=domingo .. 6=sábado) e o cálculo de
// horas — usado pela geração de escala, pelo resumo e pela exportação.

// Intervalo padrão (1h) descontado quando o dia não define o seu próprio.
export const DEFAULT_BREAK_MINUTES = 60;

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Jornada crua de um dia (como fica gravada no funcionário).
export interface DayJourney {
  off: boolean; // true = folga fixa nesse dia da semana
  start?: string; // HH:mm (quando off=false)
  end?: string; // HH:mm
  breakMinutes?: number; // intervalo do dia
}

// Fonte mínima para resolver a semana: o novo campo `week` ou os campos
// legados (defaultStart/defaultEnd/weeklyDayOff/defaultBreakMinutes).
export interface WeekSource {
  week?: DayJourney[];
  defaultStart?: string;
  defaultEnd?: string;
  weeklyDayOff?: number;
  defaultBreakMinutes?: number;
}

// Jornada resolvida de um dia: intervalo já normalizado.
export interface ResolvedDay {
  off: boolean;
  start?: string;
  end?: string;
  breakMinutes: number;
}

/**
 * Devolve sempre 7 dias (0=domingo .. 6=sábado). Prefere `week`; se ausente,
 * deriva dos campos legados (mesma jornada todo dia, menos o weeklyDayOff).
 * Assim funcionários antigos continuam funcionando sem migração.
 */
export function resolveWeek(emp: WeekSource): ResolvedDay[] {
  if (emp.week && emp.week.length === 7) {
    return emp.week.map((d) =>
      d.off || !d.start || !d.end
        ? { off: true, breakMinutes: 0 }
        : {
            off: false,
            start: d.start,
            end: d.end,
            breakMinutes: d.breakMinutes ?? DEFAULT_BREAK_MINUTES,
          },
    );
  }
  const brk = emp.defaultBreakMinutes ?? DEFAULT_BREAK_MINUTES;
  return Array.from({ length: 7 }, (_, dow): ResolvedDay =>
    dow === emp.weeklyDayOff || !emp.defaultStart || !emp.defaultEnd
      ? { off: true, breakMinutes: 0 }
      : {
          off: false,
          start: emp.defaultStart,
          end: emp.defaultEnd,
          breakMinutes: brk,
        },
  );
}

/** Minutos líquidos trabalhados no dia (expediente − intervalo), nunca negativo. */
export function netMinutes(day: ResolvedDay): number {
  if (day.off || !day.start || !day.end) return 0;
  return Math.max(0, minutesOf(day.end) - minutesOf(day.start) - day.breakMinutes);
}

/** Horas líquidas creditadas num dia de atestado, pela jornada padrão do dia. */
export function creditedHours(week: ResolvedDay[], dayOfWeek: number): number {
  return netMinutes(week[dayOfWeek]) / 60;
}

/**
 * Horas mensais de folha, com o DSR (descanso semanal remunerado) embutido —
 * modelo CLT de "mês comercial" de 30 dias (4,2857 semanas):
 *
 *   DSR na semana   = horas trabalhadas na semana ÷ dias trabalhados × dias de folga
 *   folha na semana = trabalhadas + DSR
 *   folha no mês    = folha na semana × (30 / 7)
 *
 * O que equivale a: jornada diária média × 30. Ex.: 6 dias × 7h → 210h/mês.
 * É contratual (não depende de quantos dias o mês específico tem).
 */
export function payrollMonthlyHours(week: ResolvedDay[]): number {
  const workDays = week.filter((d) => !d.off);
  const nWork = workDays.length;
  if (nWork === 0) return 0;
  const weeklyWorkedMin = workDays.reduce((s, d) => s + netMinutes(d), 0);
  const dailyAvgMin = weeklyWorkedMin / nWork;
  const monthlyMin = dailyAvgMin * 30; // = (trab + DSR) × 30/7
  return Math.round((monthlyMin / 60) * 100) / 100;
}
