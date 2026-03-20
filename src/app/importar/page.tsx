"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, PlusCircle } from "lucide-react";

const CONTRATOS = ["6700302926", "6700248017"];

const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all";
const labelCls = "block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted";

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
    <div className="max-w-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Importar Empleados</h1>
          <p className="text-sm text-muted mt-0.5">Subí tu archivo Excel o agregá personal manualmente.</p>
        </div>
      </div>

      {/* Carga Masiva */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Carga Masiva (Excel)</h2>
          <p className="text-xs text-muted mt-0.5">Procesá múltiples empleados desde un archivo .xlsx</p>
        </div>

        {/* Info box */}
        <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-lg p-4 text-xs text-accent-gold">
          <p className="font-semibold mb-2">Estructura del archivo:</p>
          <ul className="space-y-1.5 text-muted">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-accent-gold/10 rounded-md text-[10px] font-semibold text-accent-gold border border-accent-gold/20">A</span>
              <span>Apellido y nombre</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-accent-gold/10 rounded-md text-[10px] font-semibold text-accent-gold border border-accent-gold/20">B</span>
              <span>Contrato <span className="opacity-60">(Ej: 6700302926)</span></span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-accent-gold/10 rounded-md text-[10px] font-semibold text-accent-gold border border-accent-gold/20">C</span>
              <span>Legajo SAP</span>
            </li>
            <li className="flex items-center gap-2 opacity-60">
              <span className="w-5 h-5 flex items-center justify-center bg-accent-gold/10 rounded-md text-[10px] font-semibold text-accent-gold border border-accent-gold/20">D</span>
              <span>Categoría (Opcional)</span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className={labelCls}>Archivo Excel (.xlsx)</label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent-gold/40 transition-all bg-background group">
              <FileSpreadsheet className="w-8 h-8 text-muted mx-auto mb-2 group-hover:text-accent-gold transition-colors" />
              <p className="text-xs text-muted mb-3">Arrastrá o seleccioná el archivo</p>
              <input
                type="file"
                name="archivo"
                accept=".xlsx,.xls"
                required
                className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-background file:text-foreground file:border file:border-border hover:file:bg-black/[0.04] dark:hover:file:bg-white/[0.04] cursor-pointer transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Importando...</span></>
            ) : (
              <><Upload className="w-4 h-4" /><span>Procesar Excel</span></>
            )}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Importación completada
            </div>
            <p className="text-sm text-muted">
              Se importaron <strong className="text-emerald-600 dark:text-emerald-400">{result.inserted}</strong> empleados correctamente.
            </p>
            {result.errors.length > 0 && (
              <div className="border-t border-emerald-500/20 pt-3 space-y-2">
                <p className="text-xs font-medium text-muted flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {result.errors.length} registros con advertencias:
                </p>
                <div className="bg-background rounded-lg p-3 overflow-y-auto max-h-32 border border-border">
                  <ul className="space-y-1.5 text-xs text-muted font-mono">
                    {result.errors.map((e, i) => <li key={i} className="flex items-start gap-2 border-b border-border pb-1 last:border-0">• {e}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Carga Individual */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Carga Individual</h2>
          <p className="text-xs text-muted mt-0.5">Registrá un solo empleado rápidamente.</p>
        </div>

        {singleSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            {singleSuccess}
          </div>
        )}
        {singleError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm flex items-center gap-2 text-red-500">
            <AlertCircle className="w-4 h-4" />
            {singleError}
          </div>
        )}

        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre y Apellido</label>
              <input
                type="text"
                required
                value={singleData.nombre_apellido}
                onChange={(e) => setSingleData({ ...singleData, nombre_apellido: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Legajo SAP</label>
              <input
                type="text"
                required
                value={singleData.legajo}
                onChange={(e) => setSingleData({ ...singleData, legajo: e.target.value })}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Contrato</label>
              <select
                required
                value={singleData.contrato}
                onChange={(e) => setSingleData({ ...singleData, contrato: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="">Seleccionar...</option>
                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`${labelCls} opacity-60`}>Categoría (Opcional)</label>
              <input
                type="text"
                value={singleData.categoria}
                onChange={(e) => setSingleData({ ...singleData, categoria: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={singleLoading}
            className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {singleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            Confirmar Alta
          </button>
        </form>
      </div>
    </div>
  );
}
