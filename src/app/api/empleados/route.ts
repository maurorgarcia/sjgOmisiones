import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const sanitized = q.replace(/[%_]/g, "\\$&");

  const { data, error } = await supabase
    .from("empleados")
    .select("nombre_apellido, legajo, contrato, categoria")
    .or(`nombre_apellido.ilike.%${sanitized}%,legajo.ilike.%${sanitized}%`)
    .limit(10);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al buscar empleados." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

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
    const { nombre_apellido, legajo, contrato, categoria } = body;

    if (!nombre_apellido || !legajo || !contrato) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }

    if (typeof nombre_apellido !== "string" || typeof legajo !== "string" || typeof contrato !== "string") {
      return NextResponse.json({ error: "Tipos de datos inválidos." }, { status: 400 });
    }

    const { error } = await supabase
      .from("empleados")
      .upsert(
        {
          nombre_apellido: nombre_apellido.trim().toUpperCase(),
          legajo: legajo.trim(),
          contrato: contrato.trim(),
          categoria: typeof categoria === "string" ? categoria.trim() || null : null,
        },
        { onConflict: "legajo" }
      );

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Error al guardar el empleado." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
