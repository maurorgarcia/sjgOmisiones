"use client";

import { CheckCircle2, Loader2, Maximize2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTIVOS, CONTRATOS } from "@/types";
import { useCargaForm } from "./useCargaForm";
import { EmpleadoSearch } from "@/components/EmpleadoSearch";
import { HorasDetalle } from "@/components/HorasDetalle";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorCarga } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Shared input/select class helpers — keeps JSX clean and styles consistent
const inputCls = (hasError?: boolean) =>
  `w-full bg-background border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm font-black placeholder:text-slate-400 dark:placeholder:text-slate-700 text-foreground ${
    hasError ? "border-red-500/50 bg-red-500/5" : "border-border"
  }`;

const selectCls = (hasError?: boolean) =>
  `w-full bg-background border rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm font-black uppercase tracking-widest text-foreground appearance-none cursor-pointer ${
    hasError ? "border-red-500/50 bg-red-500/5" : "border-border"
  }`;

const labelCls = "block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-600 dark:text-slate-500 ml-1";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-red-500 text-xs mt-1 font-bold">{msg}</p> : null;

// ─── Page ──────────────────────────────────────────────────────────────────────

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
  }, [fetchRecent, f.loading]); // Refetch when loading changes (after save)

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent-gold rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">
              Cargar Registro
            </h1>
            <p className="text-slate-600 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
              Gestión de Omisiones y Errores SJG
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            window.open(
              "/carga/mini",
              "MiniCarga",
              "width=450,height=800,menubar=no,toolbar=no,location=no,status=no"
            )
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-accent-gold/20 bg-accent-gold/5 text-accent-gold text-[10px] font-black uppercase tracking-wider hover:bg-accent-gold/10 transition-all active:scale-95 shadow-lg"
          title="Abrir como ventana flotante para multitarea"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Modo Ventana</span>
        </button>
      </div>

      {/* Form card */}
      <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl p-8 backdrop-blur-xl">
        <form onSubmit={f.handleSubmit} className="space-y-5" noValidate>

          {/* ── Employee search ─────────────────────────────────────────── */}
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

          {/* ── Fecha ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Fecha del Error <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <input
                type="date"
                required
                value={f.fecha}
                onChange={(e) => f.setFecha(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* ── Multi-OT Management ───────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="bg-accent-gold/10 p-2 rounded-xl">
                  <Maximize2 className="w-4 h-4 text-accent-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Ordenes de Trabajo</h3>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Gestión de una o más OTs para el día</p>
                </div>
              </div>
              <button
                type="button"
                onClick={f.addOT}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-accent-gold/20 bg-accent-gold/5 text-accent-gold text-[10px] font-black uppercase tracking-wider hover:bg-accent-gold/10 transition-all active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar OT</span>
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {f.ots.map((otEntry, idx) => (
                <motion.div
                  key={otEntry.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`p-6 rounded-[2rem] border transition-all ${
                    idx % 2 === 0 
                      ? "bg-slate-500/5 border-slate-500/10 shadow-sm" 
                      : "bg-emerald-500/5 border-emerald-500/10 shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${
                         idx % 2 === 0 ? "bg-slate-500/20 text-slate-500" : "bg-emerald-500/20 text-emerald-500 shadow-sm shadow-emerald-500/20"
                       }`}>
                         OT {idx + 1}
                       </span>
                    </div>
                    {f.ots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => f.removeOT(otEntry.id)}
                        className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all active:scale-95"
                        title="Quitar esta OT"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    {/* Motivo */}
                    <div>
                      <label className={labelCls}>
                        Motivo <span className="text-accent-gold ml-1 font-bold">*</span>
                      </label>
                      <select
                        required
                        value={otEntry.motivo}
                        onChange={(e) => f.updateOT(otEntry.id, { motivo: e.target.value })}
                        className={selectCls(!!f.errors[`motivo_${idx}`])}
                      >
                        <option value="">Seleccione un motivo...</option>
                        {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <FieldError msg={f.errors[`motivo_${idx}`]} />
                    </div>

                    {/* Número de OT */}
                    <div>
                      <label className={labelCls}>
                        Número de OT
                        {otEntry.motivo && otEntry.motivo !== "OT Inexistente" && (
                          <span className="text-slate-400 font-normal ml-1">(8-12 dígitos)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={otEntry.ot}
                        onChange={(e) => f.updateOT(otEntry.id, { ot: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                        disabled={otEntry.motivo === "OT Inexistente"}
                        className={`${inputCls(!!f.errors[`ot_${idx}`])} disabled:opacity-20`}
                        placeholder={otEntry.motivo === "OT Inexistente" ? "No aplica" : "Ej: 0012300456"}
                        maxLength={12}
                      />
                      <FieldError msg={f.errors[`ot_${idx}`]} />
                    </div>
                  </div>

                  {/* Horas para esta OT */}
                  <div className="bg-background/40 p-5 rounded-3xl border border-border/50">
                    <HorasDetalle
                      horasNormales={otEntry.horasNormales}
                      setHorasNormales={(v) => f.updateOT(otEntry.id, { horasNormales: v })}
                      hsNormalesMods={f.hsNormalesMods}
                      setHsNormalesMods={f.setHsNormalesMods}
                      horas50={otEntry.horas50}
                      setHoras50={(v) => f.updateOT(otEntry.id, { horas50: v })}
                      hs50Mods={f.hs50Mods}
                      setHs50Mods={f.setHs50Mods}
                      horas100={otEntry.horas100}
                      setHoras100={(v) => f.updateOT(otEntry.id, { horas100: v })}
                      hs100Mods={f.hs100Mods}
                      setHs100Mods={f.setHs100Mods}
                      isSecondary={idx > 0}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-border pt-6">
            {/* ── Contrato ───────────────────────────────────────── */}
            <div>
              <label className={labelCls}>
                Contrato <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <select
                required
                value={f.contrato}
                onChange={(e) => { f.setContrato(e.target.value); f.setErrors((err) => ({ ...err, contrato: "" })); }}
                className={selectCls(!!f.errors.contrato)}
              >
                <option value="">Seleccionar contrato...</option>
                {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldError msg={f.errors.contrato} />
            </div>

            {/* ── Sector ─────────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>
                Sector / Área <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <input
                type="text"
                value={f.sector}
                onChange={(e) => { f.setSector(e.target.value); f.setErrors((err) => ({ ...err, sector: "" })); }}
                className={inputCls(!!f.errors.sector)}
                placeholder="Ej: Planta A, Mantenimiento..."
              />
              <FieldError msg={f.errors.sector} />
            </div>
          </div>

          {/* ── Horario ─────────────────────────────────────────────────── */}
          <div>
            <label className={labelCls}>
              Horario de Fichaje <span className="text-accent-gold ml-1 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-600 dark:text-slate-500 mb-1 uppercase tracking-widest ml-1">
                  Entrada
                </label>
                <input
                  type="time"
                  value={f.horarioDesde}
                  onChange={(e) => { f.setHorarioDesde(e.target.value); f.setErrors((err) => ({ ...err, horarioDesde: "" })); }}
                  className={`w-full bg-background border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] ${f.errors.horarioDesde ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                />
                <FieldError msg={f.errors.horarioDesde} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-600 dark:text-slate-500 mb-1 uppercase tracking-widest ml-1">
                  Salida
                </label>
                <input
                  type="time"
                  value={f.horarioHasta}
                  onChange={(e) => { f.setHorarioHasta(e.target.value); f.setErrors((err) => ({ ...err, horarioHasta: "" })); }}
                  className={`w-full bg-background border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] ${f.errors.horarioHasta ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                />
                <FieldError msg={f.errors.horarioHasta} />
              </div>
            </div>
          </div>

          {/* ── Notas ───────────────────────────────────────────────────── */}
          <div className="pt-2 border-t border-border">
            <label className="block text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
              Notas adicionales
            </label>
            <textarea
              value={f.notas}
              onChange={(e) => f.setNotas(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition resize-none text-sm text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 font-medium"
              placeholder="Algún comentario sobre el error..."
            />
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="pt-6 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => f.router.push("/")}
              className="px-6 py-3.5 rounded-2xl border border-border text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={f.loading}
              className="min-w-[200px] bg-gradient-to-r from-accent-gold to-accent-gold-dark hover:shadow-[0_8px_30px_rgba(217,119,6,0.2)] text-black font-black py-4 px-8 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98] text-[11px] uppercase tracking-widest"
            >
              {f.loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    Guardar{" "}
                    {f.selectedEmpleados.length > 1
                      ? `(${f.selectedEmpleados.length})`
                      : "Registro"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Recent entries section ────────────────────────────────────── */}
      <div className="mt-12 mb-20">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="bg-accent-gold/10 p-2 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-accent-gold" />
          </div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Cargados Recientemente</h2>
        </div>

        <div className="space-y-3">
          {loadingRecent ? (
            <div className="bg-card/20 rounded-3xl p-8 border border-border flex flex-col items-center gap-4">
               <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Buscando historial...</p>
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="bg-card/20 rounded-3xl p-8 border border-border text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No hay registros recientes.</p>
            </div>
          ) : (
            recentEntries.map((err) => (
              <motion.div
                key={err.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/30 hover:bg-card/50 border border-border hover:border-accent-gold/20 rounded-2xl p-4 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center font-black text-slate-500 text-xs shadow-inner uppercase">
                    {err.nombre_apellido.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground uppercase tracking-tight">{err.nombre_apellido}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">{err.motivo_error}</span>
                      <span className="text-slate-400 text-[10px]">·</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(err.fecha), 'dd MMM', { locale: es })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">OT: {err.ot || '---'}</div>
                   <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">{err.sector}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
