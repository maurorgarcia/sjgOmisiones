import { supabase } from "@/lib/supabase";
import { generateExcelBuffer } from "@/lib/excel";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "pendientes";
  const motivo = searchParams.get("motivo") || "todos";
  const fecha = searchParams.get("fecha");

  try {
    let query = supabase
      .from("error_carga")
      .select("*")
      .order("fecha", { ascending: false });

    // Filter by date
    if (fecha) {
      const startIso = `${fecha}T00:00:00.000Z`;
      const endIso = `${fecha}T23:59:59.999Z`;
      
      query = query.gte('fecha', startIso).lte('fecha', endIso);
    }

    // Only download pending errors by default for the daily report, or all if requested
    if (filter === "pendientes") {
      query = query.eq("resuelto", false);
    } else if (filter === "resueltos") {
      query = query.eq("resuelto", true);
    }

    if (motivo !== "todos") {
      query = query.eq("motivo_error", motivo);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "No se pudieron obtener los datos" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No hay datos para exportar" }, { status: 404 });
    }

    const buffer = await generateExcelBuffer(data);
    
    // YYYY-MM-DD
    const dateStr = fecha || new Date().toISOString().split("T")[0];
    const filename = `Omisiones_${dateStr}.xlsx`;

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
