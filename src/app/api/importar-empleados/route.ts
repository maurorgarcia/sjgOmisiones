import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import * as XLSX from "xlsx";

const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user?.role !== "admin") {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("archivo") as File;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 5MB." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: "Formato de archivo no permitido. Use .xlsx o .xls" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const dataRows = (rows as string[][]).slice(1).filter((r) => r[0] && r[2]);

    const empleados = dataRows.map((row) => ({
      nombre_apellido: String(row[0]).trim().toUpperCase(),
      contrato: String(row[1]).trim(),
      legajo: String(row[2]).trim(),
      categoria: String(row[3] || "").trim() || null,
    }));

    if (empleados.length === 0) {
      return NextResponse.json({ error: "No se encontraron filas válidas en el archivo." }, { status: 400 });
    }

    const errors: string[] = [];
    let inserted = 0;

    const batchSize = 100;
    for (let i = 0; i < empleados.length; i += batchSize) {
      const batch = empleados.slice(i, i + batchSize);
      const { error } = await supabase
        .from("empleados")
        .upsert(batch, { onConflict: "legajo" });

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({ inserted, errors });
  } catch (err: unknown) {
    console.error("Error importing employees:", err);
    return NextResponse.json(
      { error: "Error interno al procesar el archivo." },
      { status: 500 }
    );
  }
}
