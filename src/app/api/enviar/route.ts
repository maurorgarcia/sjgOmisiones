import { supabase } from "@/lib/supabase";
import { generateExcelBuffer } from "@/lib/excel";
import { sendEmail } from "@/lib/email";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user?.role !== "admin") {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const filtro = body.filter || "pendientes";
    const filtroMotivo = body.filterMotivo || "todos";
    const fecha = body.fecha;
    const fechaHasta = body.fechaHasta;
    const sector = body.sector;

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

    if (filtro === "pendientes") query = query.eq("resuelto", false);
    if (filtro === "resueltos") query = query.eq("resuelto", true);
    if (filtroMotivo !== "todos") query = query.eq("motivo_error", filtroMotivo);
    if (sector?.trim()) query = query.ilike("sector", `%${sector.trim()}%`);

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No hay errores para enviar." }, { status: 404 });
    }

    // 2. Generar Excel
    const buffer = await generateExcelBuffer(data);
    
    const dateStr = fecha
      ? fechaHasta
        ? `${new Date(fecha + "T12:00:00").toLocaleDateString("es-AR")} a ${new Date(fechaHasta + "T12:00:00").toLocaleDateString("es-AR")}`
        : new Date(fecha + "T12:00:00").toLocaleDateString("es-AR")
      : new Date().toLocaleDateString("es-AR");
    const dateSlug = fecha || new Date().toISOString().split("T")[0];
    const filename = fechaHasta
      ? `Omisiones_${dateSlug}_a_${fechaHasta}.xlsx`
      : `Omisiones_${dateSlug}.xlsx`;
    const motivoLabel = filtroMotivo !== "todos" ? ` · Motivo: ${filtroMotivo}` : "";

    const htmlBody = `
      <h2>Reporte de Errores - ${dateStr}</h2>
      <p>Se adjunta el reporte de omisiones y errores de fichaje.</p>
      <ul>
        <li><strong>Filtro aplicado:</strong> ${filtro.toUpperCase()}${motivoLabel}</li>
        <li><strong>Total de registros:</strong> ${data.length}</li>
      </ul>
      <p><em>Este es un correo generado automáticamente por el Sistema SJG Omisiones.</em></p>
    `;

    // 4. Enviar Correo
    await sendEmail({
      subject: `🚨 Reporte Diario de Omisiones - ${dateStr}`,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return NextResponse.json({ success: true, message: "Correo enviado correctamente." });
  } catch (error: any) {
    console.error("Error al enviar el correo:", error);
    return NextResponse.json(
      { error: error?.message || "Ocurrió un error interno al intentar enviar el correo." },
      { status: 500 }
    );
  }
}
