import { HolidayScope } from '../schemas/holiday.schema';

export interface FixedHoliday {
  monthDay: string; // MM-DD
  name: string;
  scope: HolidayScope;
}

/**
 * Feriados estaduais (CE) e municipais (Sobral) de data fixa,
 * acrescentados à importação de qualquer ano.
 * Municipais conforme Lei Municipal nº 2.338/2023.
 */
export const SOBRAL_FIXED_HOLIDAYS: FixedHoliday[] = [
  { monthDay: '03-19', name: 'Dia de São José', scope: 'estadual' },
  { monthDay: '03-25', name: 'Data Magna do Ceará', scope: 'estadual' },
  {
    monthDay: '07-05',
    name: 'Aniversário de Sobral (Dia do Município)',
    scope: 'municipal',
  },
  {
    monthDay: '12-08',
    name: 'Nossa Senhora da Conceição (Padroeira de Sobral)',
    scope: 'municipal',
  },
];
