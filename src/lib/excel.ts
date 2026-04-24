import * as xlsx from "xlsx";

export type ErrorRow = {
  fecha: string;
  dia_semana: string;
  legajo: string;
  nombre_apellido: string;
  motivo_error: string;
  ot: string | null;
  sector: string;
  horario: string | null;
  notas: string | null;
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

export async function generateExcelBuffer(errores: ErrorRow[]): Promise<Buffer> {
  // 1. Armar las filas planas (exactamente el formato que pidió el usuario)
  const rows = errores.map((err) => {
    return {
      Fecha: new Date(err.fecha.split("T")[0] + "T12:00:00").toLocaleDateString("es-AR"),
      Día: err.dia_semana,
      Legajo: err.legajo,
      "Nombre y Apellido": err.nombre_apellido,
      "Motivo del Error": err.motivo_error,
      OT: err.ot || "-",
      Sector: err.sector,
      Horario: err.horario || "-",
      "Horas Cargadas": (() => {
        const parts = [];
        if (err.horas_normales) {
          const mods = [err.hs_normales_insa && "INSA", err.hs_normales_polu && "POLU", err.hs_normales_noct && "NOCT"].filter(Boolean);
          parts.push(`${err.horas_normales}hs Normales${mods.length ? ` (${mods.join(", ")})` : ""}`);
        }
        if (err.horas_50) {
          const mods = [err.hs_50_insa && "INSA", err.hs_50_polu && "POLU", err.hs_50_noct && "NOCT"].filter(Boolean);
          parts.push(`${err.horas_50}hs al 50%${mods.length ? ` (${mods.join(", ")})` : ""}`);
        }
        if (err.horas_100) {
          const mods = [err.hs_100_insa && "INSA", err.hs_100_polu && "POLU", err.hs_100_noct && "NOCT"].filter(Boolean);
          parts.push(`${err.horas_100}hs al 100%${mods.length ? ` (${mods.join(", ")})` : ""}`);
        }
        return parts.length > 0 ? parts.join(" | ") : "-";
      })(),
      Notas: err.notas || "-"
    };
  });

  // 2. Crear una WorkBook y una WorkSheet
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);

  // 3. (Opcional) Ajustar anchos de columnas
  ws["!cols"] = [
    { wch: 12 }, // Fecha
    { wch: 10 }, // Día
    { wch: 10 }, // Legajo
    { wch: 25 }, // Nombre
    { wch: 25 }, // Motivo
    { wch: 12 }, // OT
    { wch: 20 }, // Sector
    { wch: 15 }, // Horario
    { wch: 40 }, // Horas Cargadas
    { wch: 30 }  // Notas
  ];

  // 4. Adjuntar la hoja al libro
  xlsx.utils.book_append_sheet(wb, ws, "Errores Fichada");

  // 5. Devolver como un buffer binario
  const excelBuffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  return excelBuffer;
}
