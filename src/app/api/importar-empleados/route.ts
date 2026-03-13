import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("archivo") as File;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Skip header row (row 0)
    const dataRows = rows.slice(1).filter((r) => r[0] && r[2]); // must have name and legajo

    const empleados = dataRows.map((row) => ({
      nombre_apellido: String(row[0]).trim(),
      contrato: String(row[1]).trim(),
      legajo: String(row[2]).trim(),
      categoria: String(row[3] || "").trim() || null,
    }));

    if (empleados.length === 0) {
      return NextResponse.json({ error: "No se encontraron filas válidas en el archivo." }, { status: 400 });
    }

    const errors: string[] = [];
    let inserted = 0;

    // Upsert in batches of 100
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
  } catch (err: any) {
    console.error("Error importing employees:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno al procesar el archivo." },
      { status: 500 }
    );
  }
}
