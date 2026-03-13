import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre_apellido, legajo, contrato, categoria } = body;

    if (!nombre_apellido || !legajo || !contrato) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }

    const { error } = await supabase
      .from("empleados")
      .upsert({
        nombre_apellido: nombre_apellido.trim(),
        legajo: legajo.trim(),
        contrato: contrato.trim(),
        categoria: categoria?.trim() || null,
      }, { onConflict: 'legajo' });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Error al guardar el empleado." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error API empleados:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
