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
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Base de Empleados</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
              Subí tu archivo Excel o agregá personal manualmente.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 shadow-2xl p-8 space-y-6 mb-8 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            Carga Masiva (Excel)
          </h2>
        </div>
        
        {/* Info box */}
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 text-xs text-amber-500 shadow-inner group">
          <p className="font-black uppercase tracking-[0.1em] mb-3 flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500 text-black flex items-center justify-center font-black">!</div>
            Estructura del Archivo:
          </p>
          <ul className="space-y-2 opacity-80 decoration-amber-500/30">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-amber-500/10 rounded-full text-[10px] font-black border border-amber-500/20">A</span>
              <span className="font-bold">Apellido y nombre</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-amber-500/10 rounded-full text-[10px] font-black border border-amber-500/20">B</span>
              <span className="font-bold">Contrato</span> <span className="opacity-50 text-[10px]">(Ej: 6700302926)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center bg-amber-500/10 rounded-full text-[10px] font-black border border-amber-500/20">C</span>
              <span className="font-bold">Legajo SAP</span>
            </li>
            <li className="flex items-center gap-2 opacity-60">
              <span className="w-5 h-5 flex items-center justify-center bg-amber-500/10 rounded-full text-[10px] font-black border border-amber-500/20">D</span>
              <span className="font-bold italic">Categoría (Opcional)</span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              Archivo Excel (.xlsx)
            </label>
            <div className="border-2 border-dashed border-white/5 rounded-[2rem] p-10 text-center hover:border-amber-500/30 transition-all bg-black/40 group relative overflow-hidden">
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <FileSpreadsheet className="w-10 h-10 text-slate-700 mx-auto mb-3 group-hover:text-amber-500 transition-colors group-hover:scale-110 duration-300" />
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-4">Arrastrá o seleccioná el archivo</p>
                <input
                  type="file"
                  name="archivo"
                  accept=".xlsx,.xls"
                  required
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-white/5 file:text-slate-400 hover:file:bg-amber-500 hover:file:text-black cursor-pointer transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:opacity-50 shadow-amber-500/10 group overflow-hidden relative focus:ring-4 focus:ring-amber-500/30"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="relative z-10">Importando...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Procesar Excel</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl text-[11px] font-black uppercase tracking-tight">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-widest">
              <CheckCircle2 className="w-5 h-5" />
              Importación completada
            </div>
            <p className="text-emerald-400/80 text-[11px] font-bold">
              ✅ Se importaron <strong className="text-emerald-400 text-sm font-black tracking-tight">{result.inserted}</strong> empleados correctamente.
            </p>
            {result.errors.length > 0 && (
              <div className="mt-4 border-t border-emerald-500/10 pt-4 space-y-2">
                <p className="font-black text-[10px] text-amber-500/70 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> {result.errors.length} registros con advertencias:
                </p>
                <div className="bg-black/20 rounded-xl p-3 overflow-y-auto max-h-32 custom-scrollbar">
                  <ul className="space-y-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tight font-mono">
                    {result.errors.map((e, i) => <li key={i} className="flex items-start gap-2 border-b border-white/5 pb-1 last:border-0">• {e}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agregar un empleado manualmente */}
      <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 shadow-2xl p-8 space-y-6 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full" />
            Carga Individual
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Registrá un solo empleado rápidamente.</p>
        </div>

        {singleSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-[11px] font-black uppercase tracking-tight flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            {singleSuccess}
          </div>
        )}
        {singleError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-[11px] font-black uppercase tracking-tight flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            {singleError}
          </div>
        )}

        <form onSubmit={handleSingleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre y Apellido</label>
              <input type="text" required value={singleData.nombre_apellido}
                onChange={(e) => setSingleData({ ...singleData, nombre_apellido: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all shadow-inner" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Legajo SAP</label>
              <input type="text" required value={singleData.legajo}
                onChange={(e) => setSingleData({ ...singleData, legajo: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all shadow-inner" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contrato</label>
              <select required value={singleData.contrato}
                onChange={(e) => setSingleData({ ...singleData, contrato: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer" >
                <option value="" className="bg-slate-900">Seleccionar...</option>
                {CONTRATOS.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría <span className="opacity-40">(Opcional)</span></label>
              <input type="text" value={singleData.categoria}
                onChange={(e) => setSingleData({ ...singleData, categoria: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all shadow-inner" />
            </div>
          </div>
          <button
            type="submit"
            disabled={singleLoading}
            className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:bg-white/10 hover:text-amber-500 active:scale-95 disabled:opacity-50 group shadow-xl"
          >
            {singleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            Confirmar Alta
          </button>
        </form>
      </div>
    </div>
  );
}
