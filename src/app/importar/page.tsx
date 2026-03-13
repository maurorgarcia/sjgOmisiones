"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, PlusCircle } from "lucide-react";

const CONTRATOS = ["6700302926", "6700248017"];

type UploadResult = {
  inserted: number;
  errors: string[];
};

export default function ImportarPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");

  // Single employee form
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState("");
  const [singleSuccess, setSingleSuccess] = useState("");
  const [singleData, setSingleData] = useState({ nombre_apellido: "", legajo: "", contrato: "", categoria: "" });

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    const formData = new FormData(e.currentTarget);
    const file = formData.get("archivo") as File;

    if (!file || file.size === 0) {
      setError("Por favor seleccioná un archivo Excel.");
      setLoading(false);
      return;
    }

    const data = new FormData();
    data.append("archivo", file);

    const res = await fetch("/api/importar-empleados", {
      method: "POST",
      body: data,
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Ocurrió un error al importar el archivo.");
    } else {
      setResult(json);
    }

    setLoading(false);
  };

  const handleSingleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSingleLoading(true);
    setSingleError("");
    setSingleSuccess("");

    try {
      const res = await fetch("/api/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(singleData),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "No se pudo agregar el empleado.");
      
      setSingleSuccess("Empleado agregado correctamente.");
      setSingleData({ nombre_apellido: "", legajo: "", contrato: "", categoria: "" });
    } catch (err: any) {
      setSingleError(err.message);
    } finally {
      setSingleLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Importar Base de Empleados</h1>
        <p className="text-slate-500 text-sm mt-1">
          Subí tu archivo Excel con los legajos para habilitar el autocompletado en el formulario de carga.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6 mb-8">
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Carga Masiva (Excel)</h2>
        </div>
        
        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Formato esperado del archivo Excel:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-600">
            <li>Columna A: <strong>Apellido y nombre</strong></li>
            <li>Columna B: <strong>Contrato</strong> (ej: 6700302926)</li>
            <li>Columna C: <strong>Legajo SAP</strong></li>
            <li>Columna D: <strong>Categoría</strong> (opcional)</li>
          </ul>
          <p className="mt-2 text-blue-500 text-xs">La primera fila debe ser el encabezado.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Archivo Excel (.xlsx)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">Arrastrá o seleccioná el archivo</p>
              <input
                type="file"
                name="archivo"
                accept=".xlsx,.xls"
                required
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-sm shadow-blue-500/20"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
            ) : (
              <><Upload className="w-4 h-4" /> Importar Empleados</>
            )}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
            <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              Importación completada
            </div>
            <p className="text-green-600">
              ✅ Se importaron <strong>{result.inserted}</strong> empleados correctamente.
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2 text-yellow-700">
                <p className="font-semibold">⚠ {result.errors.length} registros con errores:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 5 && <li>...y {result.errors.length - 5} más.</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agregar un empleado manualmente */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Carga Individual</h2>
          <p className="text-sm text-slate-500 mb-6">Agregá un solo empleado rápidamente sin necesidad de usar Excel.</p>
        </div>

        {singleSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm flex items-center gap-2 text-green-700 font-bold mb-4">
            <CheckCircle2 className="w-5 h-5" />
            {singleSuccess}
          </div>
        )}
        {singleError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm flex items-center gap-2 text-red-700 font-bold mb-4">
            <AlertCircle className="w-5 h-5" />
            {singleError}
          </div>
        )}

        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre y Apellido</label>
              <input type="text" required value={singleData.nombre_apellido}
                onChange={(e) => setSingleData({ ...singleData, nombre_apellido: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Legajo SAP</label>
              <input type="text" required value={singleData.legajo}
                onChange={(e) => setSingleData({ ...singleData, legajo: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contrato</label>
              <select required value={singleData.contrato}
                onChange={(e) => setSingleData({ ...singleData, contrato: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white" >
                <option value="">Seleccionar...</option>
                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Categoría (Opcional)</label>
              <input type="text" value={singleData.categoria}
                onChange={(e) => setSingleData({ ...singleData, categoria: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
          </div>
          <button
            type="submit"
            disabled={singleLoading}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition shadow-sm disabled:opacity-50"
          >
            {singleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            Guardar Empleado
          </button>
        </form>
      </div>
    </div>
  );
}
