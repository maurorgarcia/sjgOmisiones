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
  "OT Inexistente": "bg-orange-100 text-orange-800 border-orange-200",
  "Saldo hrs insuficiente": "bg-red-100 text-red-800 border-red-200",
  "Par de fichada incompleto": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Omisión": "bg-purple-100 text-purple-800 border-purple-200",
  "Otro": "bg-slate-100 text-slate-700 border-slate-200",
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
