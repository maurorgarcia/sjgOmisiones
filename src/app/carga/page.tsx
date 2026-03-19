"use client";

import { CheckCircle2, Loader2, Maximize2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTIVOS, CONTRATOS } from "@/types";
import { useCargaForm } from "./useCargaForm";
import { EmpleadoSearch } from "@/components/EmpleadoSearch";
import { HorasDetalle } from "@/components/HorasDetalle";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorCarga } from "@/types";

// Shared aesthetics
const wrapperCls = (hasError?: boolean) =>
  `relative h-14 bg-background border rounded-2xl flex items-center shadow-inner transition-all focus-within:ring-4 focus-within:ring-accent-gold/10 focus-within:border-accent-gold/50 ${
    hasError ? "border-red-500/50 bg-red-500/5 shadow-red-500/5" : "border-border shadow-black/5"
  }`;

const baseInputCls = "w-full h-full bg-transparent border-none px-5 outline-none text-sm font-black placeholder:text-slate-400 dark:placeholder:text-slate-700 text-foreground";

const labelCls = "block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-600 dark:text-slate-500 ml-1";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-red-500 text-[10px] mt-1.5 font-black uppercase tracking-widest ml-1">{msg}</p> : null;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = ({ hasError, className, ...props }: InputProps) => (
  <div className={wrapperCls(hasError)}>
    <input {...props} className={`${baseInputCls} ${className || ""}`} />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

const Select = ({ hasError, className, children, ...props }: SelectProps) => (
  <div className={wrapperCls(hasError)}>
    <select {...props} className={`${baseInputCls} uppercase tracking-widest appearance-none cursor-pointer ${className || ""}`}>
      {children}
    </select>
    <div className="absolute right-5 pointer-events-none text-slate-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
    </div>
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

const Textarea = ({ hasError, className, ...props }: TextareaProps) => (
  <div className={`${wrapperCls(hasError)} h-auto min-h-[80px] items-start py-3`}>
    <textarea {...props} className={`${baseInputCls} h-full resize-none ${className || ""}`} />
  </div>
);

export default function CargaPage() {
  const f = useCargaForm();
  const [recentEntries, setRecentEntries] = useState<ErrorCarga[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    const { data } = await supabase
      .from("error_carga")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentEntries(data);
    setLoadingRecent(false);
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, f.loading]);

  const activeOT = f.ots[f.activeOTIndex];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-1.5 h-12 bg-accent-gold rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-accent-gold rounded-full animate-ping opacity-20" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">
              Gestión de Omisiones
            </h1>
            <p className="text-slate-500 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">
              Panel Inteligente para Errores de Carga
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            window.open("/carga/mini", "MiniCarga", "width=450,height=800")
          }
          className="group flex items-center gap-3 px-5 py-3 rounded-2xl border border-accent-gold/20 bg-accent-gold/5 text-accent-gold text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent-gold/10 transition-all active:scale-95 shadow-xl shadow-accent-gold/5"
        >
          <Maximize2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Modo Ventana</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <form onSubmit={f.handleSubmit} className="space-y-6" noValidate>
          
          {/* Card 1: Empleado y Fecha */}
          <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl p-8 backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-accent-gold/10 transition-colors" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <EmpleadoSearch
                searchRef={f.searchRef}
                searchQuery={f.searchQuery}
                suggestions={f.suggestions}
                selectedEmpleados={f.selectedEmpleados}
                searchLoading={f.searchLoading}
                showSuggestions={f.showSuggestions}
                legajoManual={f.legajoManual}
                errors={f.errors}
                onSearch={f.handleSearch}
                onFocus={() => f.suggestions.length > 0 && f.setShowSuggestions(true)}
                onSelect={f.selectEmpleado}
                onAddManual={f.addManualEmpleado}
                onRemove={f.removeEmpleado}
                onClear={f.clearSearch}
                onLegajoChange={f.setLegajoManual}
              />

                  <div className="space-y-6">
                    <div>
                      <label className={labelCls}>Fecha del Registro</label>
                      <Input
                        type="date"
                        required
                        value={f.fecha}
                        onChange={(e) => f.setFecha(e.target.value)}
                      />
                    </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Contrato</label>
                      <Select
                        required
                        value={f.contrato}
                        onChange={(e) => { f.setContrato(e.target.value); f.setErrors((err) => ({ ...err, contrato: "" })); }}
                        hasError={!!f.errors.contrato}
                      >
                        <option value="">Seleccionar...</option>
                        {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                      <FieldError msg={f.errors.contrato} />
                    </div>
                    <div>
                      <label className={labelCls}>Sector</label>
                      <Input
                        type="text"
                        value={f.sector}
                        onChange={(e) => { f.setSector(e.target.value); f.setErrors((err) => ({ ...err, sector: "" })); }}
                        hasError={!!f.errors.sector}
                        placeholder="Ej: Planta A"
                      />
                      <FieldError msg={f.errors.sector} />
                    </div>
                  </div>
              </div>
            </div>
          </div>

          {/* Card 2: Multi-OT Center */}
          <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl overflow-hidden backdrop-blur-3xl lg:min-h-[450px] flex flex-col">
            
            {/* OT Tabs Header */}
            <div className="bg-background/50 border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pr-4 max-w-[70%] sm:max-w-none">
                {f.ots.map((ot, idx) => (
                  <button
                    key={ot.id}
                    type="button"
                    onClick={() => f.setActiveOTIndex(idx)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      f.activeOTIndex === idx
                        ? "bg-accent-gold text-black shadow-lg shadow-accent-gold/20"
                        : "bg-background border border-border text-slate-500 hover:border-accent-gold/50"
                    }`}
                  >
                    <span>OT {idx + 1}</span>
                    {f.errors[`horarioDesde_${idx}`] || f.errors[`horarioHasta_${idx}`] || f.errors[`motivo_${idx}`] || f.errors[`ot_${idx}`] ? (
                      <span className="ml-2 w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                    ) : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={f.addOT}
                  className="flex-shrink-0 p-2.5 rounded-2xl bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 active:scale-95 transition-all text-[10px] font-bold uppercase flex items-center gap-2 px-4 border border-dashed border-accent-gold/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nueva OT</span>
                </button>
              </div>

              {f.ots.length > 1 && (
                <button
                  type="button"
                  onClick={() => f.removeOT(activeOT.id)}
                  className="p-2.5 rounded-2xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all active:scale-95 border border-transparent hover:border-red-500/20"
                  title="Quitar esta OT"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Active OT Content */}
            <div className="p-8 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeOT.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Config Left */}
                    <div className="space-y-6">
                      <div>
                        <label className={labelCls}>Motivo Seleccionado</label>
                        <Select
                          required
                          value={activeOT.motivo}
                          onChange={(e) => f.updateOT(activeOT.id, { motivo: e.target.value })}
                          hasError={!!f.errors[`motivo_${f.activeOTIndex}`]}
                        >
                          <option value="">Seleccionar motivo...</option>
                          {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </Select>
                        <FieldError msg={f.errors[`motivo_${f.activeOTIndex}`]} />
                      </div>

                      <div>
                        <label className={labelCls}>Número de OT {activeOT.motivo === "OT Inexistente" ? "(No aplica)" : ""}</label>
                        <Input
                          type="text"
                          value={activeOT.ot}
                          onChange={(e) => f.updateOT(activeOT.id, { ot: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                          disabled={activeOT.motivo === "OT Inexistente"}
                          hasError={!!f.errors[`ot_${f.activeOTIndex}`]}
                          className="disabled:opacity-30 disabled:grayscale"
                          placeholder="Ej: 0012300456"
                          maxLength={12}
                        />
                        <FieldError msg={f.errors[`ot_${f.activeOTIndex}`]} />
                      </div>

                      <div>
                        <label className={labelCls}>Horario del Error (OT {f.activeOTIndex + 1})</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Input
                              type="time"
                              value={activeOT.horarioDesde}
                              onChange={(e) => f.updateOT(activeOT.id, { horarioDesde: e.target.value })}
                              hasError={!!f.errors[`horarioDesde_${f.activeOTIndex}`]}
                            />
                            <FieldError msg={f.errors[`horarioDesde_${f.activeOTIndex}`]} />
                          </div>
                          <div className="space-y-1">
                            <Input
                              type="time"
                              value={activeOT.horarioHasta}
                              onChange={(e) => f.updateOT(activeOT.id, { horarioHasta: e.target.value })}
                              hasError={!!f.errors[`horarioHasta_${f.activeOTIndex}`]}
                            />
                            <FieldError msg={f.errors[`horarioHasta_${f.activeOTIndex}`]} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hours Right */}
                    <div className="bg-background/30 p-6 rounded-[2rem] border border-border/50 shadow-inner">
                      <HorasDetalle
                        horasNormales={activeOT.horasNormales}
                        setHorasNormales={(v) => f.updateOT(activeOT.id, { horasNormales: v })}
                        hsNormalesMods={activeOT.hsNormalesMods}
                        setHsNormalesMods={(v) => f.updateOT(activeOT.id, { hsNormalesMods: v })}
                        horas50={activeOT.horas50}
                        setHoras50={(v) => f.updateOT(activeOT.id, { horas50: v })}
                        hs50Mods={activeOT.hs50Mods}
                        setHs50Mods={(v) => f.updateOT(activeOT.id, { hs50Mods: v })}
                        horas100={activeOT.horas100}
                        setHoras100={(v) => f.updateOT(activeOT.id, { horas100: v })}
                        hs100Mods={activeOT.hs100Mods}
                        setHs100Mods={(v) => f.updateOT(activeOT.id, { hs100Mods: v })}
                        isSecondary
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination / Helper */}
            <div className="px-8 pb-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="flex gap-4">
                 {f.activeOTIndex > 0 && (
                   <button type="button" onClick={() => f.setActiveOTIndex(f.activeOTIndex - 1)} className="hover:text-accent-gold transition-colors flex items-center gap-1">
                     <ArrowLeft className="w-3 h-3" /> OT Anterior
                   </button>
                 )}
                 {f.activeOTIndex < f.ots.length - 1 && (
                   <button type="button" onClick={() => f.setActiveOTIndex(f.activeOTIndex + 1)} className="hover:text-accent-gold transition-colors flex items-center gap-1">
                     OT Siguiente <ArrowRight className="w-3 h-3" />
                   </button>
                 )}
              </div>
              <p>OT {f.activeOTIndex + 1} de {f.ots.length}</p>
            </div>
          </div>

          {/* Card 3: Notas y Guardado */}
          <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl p-8 backdrop-blur-3xl space-y-8">
            <div>
              <label className={labelCls}>Notas Adicionales (Global)</label>
              <Textarea
                value={f.notas}
                onChange={(e) => f.setNotas(e.target.value)}
                rows={2}
                placeholder="Obs. relevantes para el cierre..."
              />
            </div>

            <div className="flex items-center justify-between pt-4 gap-4">
              <button
                type="button"
                onClick={() => f.router.push("/")}
                className="px-8 py-4 rounded-2xl border border-border text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={f.loading}
                className="flex-1 max-w-[350px] bg-gradient-to-r from-accent-gold to-accent-gold-dark hover:shadow-[0_8px_40px_rgba(217,119,6,0.3)] text-black font-black py-4.5 px-8 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-4 active:scale-[0.98] text-[12px] uppercase tracking-[0.2em] relative overflow-hidden group shadow-xl"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
                {f.loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 opacity-70" />
                    <span>Guardar Todo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Historial Reciente */}
        {!f.loading && !f.searchQuery && (
          <div className="mt-4 animate-in fade-in duration-1000">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-accent-gold rounded-full" />
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Cargados Hoy</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
               {recentEntries.map((err) => (
                 <div key={err.id} className="bg-card/20 border border-border/50 rounded-2xl p-3 flex items-center justify-between hover:border-accent-gold/20 transition-all hover:shadow-lg">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-[9px] font-black text-slate-600 uppercase">
                          {err.nombre_apellido.slice(0,2)}
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate max-w-[120px]">{err.nombre_apellido}</p>
                          <p className="text-[8px] font-black text-accent-gold uppercase tracking-tighter">{err.motivo_error}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{err.ot || "---"}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
