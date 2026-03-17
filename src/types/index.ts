export type ErrorCarga = {
  id: number;
  fecha: string;
  dia_semana: string;
  legajo: string;
  nombre_apellido: string;
  motivo_error: string;
  ot: string | null;
  sector: string;
  horario: string | null;
  notas: string | null;
  resuelto: boolean;
  contrato?: string;
  horas_normales?: number | null;
  hs_normales_insa?: boolean;
  hs_normales_polu?: boolean;
  hs_normales_noct?: boolean;
  horas_50?: number | null;
  hs_50_insa?: boolean;
  hs_50_polu?: boolean;
  hs_50_noct?: boolean;
  horas_100?: number | null;
  hs_100_insa?: boolean;
  hs_100_polu?: boolean;
  hs_100_noct?: boolean;
};

export const MOTIVOS = [
  "OT Inexistente",
  "Saldo hrs insuficiente",
  "Par de fichada incompleto",
  "Omisión",
  "Otro",
];

export const MOTIVO_COLORS: Record<string, string> = {
  "OT Inexistente": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "Saldo hrs insuficiente": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  "Par de fichada incompleto": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Omisión": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "Otro": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export const CONTRATOS = ["6700302926", "6700248017"];

export type Faltante = {
  id: number;
  fecha: string;
  contrato: string;
  nombre_apellido: string;
  sector: string | null;
  motivo: string | null;
  created_at?: string;
};

export const SECTORES_FALTANTES = [
  "Coordinacion",
  "Pañol/Logistica",
  "Puesto Fijo",
];

export const MOTIVOS_FALTANTES = [
  "Falta cargar",
  "Falta parte",
];

export const PAGE_SIZE = 50;
