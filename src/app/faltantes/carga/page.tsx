"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft, UserPlus, Calendar, Building2, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import { CONTRATOS, SECTORES_FALTANTES, MOTIVOS_FALTANTES } from "@/types";

export default function CargaFaltantePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [contrato, setContrato] = useState("");
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("");
  const [motivo, setMotivo] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fecha) newErrors.fecha = "Requerido";
    if (!contrato) newErrors.contrato = "Requerido";
    if (!nombre.trim()) newErrors.nombre = "Requerido";
    if (!sector.trim()) newErrors.sector = "Requerido";
    if (!motivo.trim()) newErrors.motivo = "Requerido";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    
    // Adjust date to noon to avoid timezone shifts in DB
    const fechaISO = `${fecha}T12:00:00.000Z`;

    const { error } = await supabase.from("faltantes").insert([
      {
        fecha: fechaISO,
        contrato,
        nombre_apellido: nombre.trim(),
        sector: sector.trim() || null,
        motivo: motivo.trim() || null,
      },
    ]);

    if (error) {
      console.error(error);
      toast.error("Error al guardar el faltante. Verifique si la tabla existe.");
    } else {
      toast.success("✅ Faltante registrado correctamente.");
      setNombre("");
      setSector("");
      setMotivo("");
      setErrors({});
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registrar Faltante</h1>
          <p className="text-slate-500 text-sm mt-1">Anote personas que faltan en la planilla o sistema.</p>
        </div>
        <button 
          onClick={() => router.back()}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
          
          <div className="space-y-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Contrato */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" /> Contrato
              </label>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${errors.contrato ? "border-red-300" : "border-slate-200"}`}
              >
                <option value="">Seleccione contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5" /> Apellido y Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Roncaglia Lucas"
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${errors.nombre ? "border-red-300" : "border-slate-200"}`}
              />
            </div>

            {/* Sector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Sector
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ej: Pañol/Logistica"
                list="sectores-faltantes"
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${errors.sector ? "border-red-300" : "border-slate-200"}`}
              />
              <datalist id="sectores-faltantes">
                {SECTORES_FALTANTES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Motivo
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Falta cargar"
                list="motivos-faltantes"
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${errors.motivo ? "border-red-300" : "border-slate-200"}`}
              />
              <datalist id="motivos-faltantes">
                {MOTIVOS_FALTANTES.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all shadow-[0_12px_24px_-8px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Guardar Registro</span>
                <Save className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/60">
        SJG Montajes Industriales · Sistema de Gestión
      </p>
    </div>
  );
}
