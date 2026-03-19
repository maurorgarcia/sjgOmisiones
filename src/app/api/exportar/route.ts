import { supabase } from "@/lib/supabase";
import { generateExcelBuffer } from "@/lib/excel";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const EXCLUIR = ["Otro", "Saldo hrs insuficiente"];
const RELEVANTES = ["Omisión", "OT Inexistente", "Par de fichada incompleto"];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "pendientes";
  const motivo = searchParams.get("motivo") || "todos";
  const fecha = searchParams.get("fecha");
  const fechaHasta = searchParams.get("fechaHasta");
  const sector = searchParams.get("sector");
  const subgroup = searchParams.get("subgroup");

  try {
    let query = supabase
      .from("error_carga")
      .select("*")
      .order("fecha", { ascending: false });

    if (fecha) {
      const startIso = `${fecha}T00:00:00.000Z`;
      const endIso = fechaHasta
        ? `${fechaHasta}T23:59:59.999Z`
        : `${fecha}T23:59:59.999Z`;
      query = query.gte("fecha", startIso).lte("fecha", endIso);
    }

    if (filter === "pendientes") query = query.eq("resuelto", false);
    else if (filter === "resueltos") query = query.eq("resuelto", true);

    if (motivo !== "todos") query = query.eq("motivo_error", motivo);
    if (sector?.trim()) query = query.ilike("sector", `%${sector.trim()}%`);

    if (subgroup === "omisiones_fichadas") {
      query = query.in("motivo_error", [
        "Omisión",
        "Par de fichada incompleto",
        "OT Inexistente",
      ]);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "No se pudieron obtener los datos" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 404 });
    }

    // ── Filtrado especial: excluir "Otro" y "Saldo hrs insuficiente"
    //    salvo que el "Otro" comparta legajo + día con un motivo relevante ──
    let exportData = data;
    if (subgroup === "sin_otros_saldo") {
      // Construir set de claves legajo|YYYY-MM-DD que tienen motivo relevante
      const clavesRelevantes = new Set<string>();
      for (const row of data) {
        if (RELEVANTES.includes(row.motivo_error)) {
          clavesRelevantes.add(`${row.legajo}|${row.fecha.slice(0, 10)}`);
        }
      }

      exportData = data.filter((row) => {
        if (!EXCLUIR.includes(row.motivo_error)) return true;
        if (row.motivo_error === "Otro") {
          return clavesRelevantes.has(`${row.legajo}|${row.fecha.slice(0, 10)}`);
        }
        return false; // "Saldo hrs insuficiente" nunca se incluye
      });

      if (exportData.length === 0) {
        return NextResponse.json({ error: "No hay datos para exportar" }, { status: 404 });
      }
    }

    const buffer = await generateExcelBuffer(exportData);

    const dateStr = fecha || new Date().toISOString().split("T")[0];
    let filename = fechaHasta
      ? `Omisiones_${dateStr}_a_${fechaHasta}.xlsx`
      : `Omisiones_${dateStr}.xlsx`;

    if (subgroup === "omisiones_fichadas") {
      filename = `Omisiones_Incompletos_${dateStr}.xlsx`;
    }
    if (subgroup === "sin_otros_saldo") {
      filename = fechaHasta
        ? `Omisiones_Reporte_${dateStr}_a_${fechaHasta}.xlsx`
        : `Omisiones_Reporte_${dateStr}.xlsx`;
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error exportando excel:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
