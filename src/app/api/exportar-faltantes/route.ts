import { supabase } from "@/lib/supabase";
import * as xlsx from "xlsx";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  const search = searchParams.get("search");

  try {
    let query = supabase.from("faltantes").select("*").order("fecha", { ascending: false });

    if (fechaDesde) {
       const startIso = `${fechaDesde}T00:00:00.000Z`;
       const endIso = fechaHasta ? `${fechaHasta}T23:59:59.999Z` : `${fechaDesde}T23:59:59.999Z`;
       query = query.gte("fecha", startIso).lte("fecha", endIso);
    }
    
    if (search?.trim()) {
      const q = search.trim();
      query = query.or(`nombre_apellido.ilike.%${q}%,contrato.ilike.%${q}%,sector.ilike.%${q}%,motivo.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: "No hay datos" }, { status: 404 });

    const rows = data.map(f => ({
      Fecha: new Date(f.fecha).toLocaleDateString("es-AR"),
      Contrato: f.contrato,
      Empleado: f.nombre_apellido,
      Sector: f.sector || "-",
      Motivo: f.motivo || "-"
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
    xlsx.utils.book_append_sheet(wb, ws, "Faltantes");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Faltantes_${fechaDesde || 'General'}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
