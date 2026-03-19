"use client";

import React from "react";
import { Loader2, X, Search } from "lucide-react";
import type { Empleado, FormErrors } from "@/app/carga/useCargaForm";

interface EmpleadoSearchProps {
  searchRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  suggestions: Empleado[];
  selectedEmpleados: Empleado[];
  searchLoading: boolean;
  showSuggestions: boolean;
  legajoManual: string;
  errors: FormErrors;
  onSearch: (value: string) => void;
  onFocus: () => void;
  onSelect: (emp: Empleado) => void;
  onAddManual: () => void;
  onRemove: (legajo: string) => void;
  onClear: () => void;
  onLegajoChange: (val: string) => void;
}

export function EmpleadoSearch({
  searchRef,
  searchQuery,
  suggestions,
  selectedEmpleados,
  searchLoading,
  showSuggestions,
  legajoManual,
  errors,
  onSearch,
  onFocus,
  onSelect,
  onAddManual,
  onRemove,
  onClear,
  onLegajoChange,
}: EmpleadoSearchProps) {
  const hasError = !!errors.empleado || !!errors.legajo;

  return (
    <div className="space-y-2 relative" ref={searchRef}>
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-600 dark:text-slate-500 ml-1 flex items-center gap-2 group">
        <Search className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" />
        Empleado <span className="text-accent-gold ml-1 font-bold">*</span>
      </label>

      <div className={`relative h-14 bg-background border rounded-2xl flex items-center shadow-inner transition-all focus-within:ring-4 focus-within:ring-accent-gold/10 focus-within:border-accent-gold/50 ${hasError ? "border-red-500/50 bg-red-500/5" : "border-border"
        }`}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={onFocus}
          placeholder="Buscar por nombre o legajo..."
          className="w-full h-10 bg-transparent border-none px-5 outline-none text-sm font-black placeholder:text-slate-400 dark:placeholder:text-slate-700 text-foreground pr-12 self-center"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-accent-gold transition-colors hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {searchLoading && (
          <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-gold animate-spin" />
        )}
      </div>

      {/* Errors */}
      {errors.empleado && (
        <p className="text-red-500 text-xs mt-1 font-bold">{errors.empleado}</p>
      )}
      {errors.legajo && (
        <p className="text-red-500 text-xs mt-1 font-bold">{errors.legajo}</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-[110%] bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="max-h-[250px] overflow-y-auto">
            {suggestions.map((emp) => (
              <button
                key={emp.legajo}
                type="button"
                onClick={() => onSelect(emp)}
                className="w-full text-left px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-start justify-between group border-b border-border last:border-0"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-foreground group-hover:text-accent-gold transition-colors uppercase tracking-tight">
                    {emp.nombre_apellido}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-widest">
                    Legajo: {emp.legajo}
                  </p>
                </div>
                <div className="text-[10px] font-black text-accent-gold/70 uppercase bg-accent-gold/5 px-2.5 py-1.5 rounded-xl border border-accent-gold/10 group-hover:bg-accent-gold group-hover:text-black group-hover:border-transparent transition-all">
                  {emp.contrato}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results — manual entry fallback */}
      {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
        <div className="absolute z-50 left-0 right-0 top-[110%] bg-card rounded-[2rem] border border-border shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-[10px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-widest mb-3">
            Empleado no encontrado. Ingrese legajo manual:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={legajoManual}
              onChange={(e) => onLegajoChange(e.target.value)}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all"
              placeholder="Legajo SAP..."
            />
            <button
              type="button"
              onClick={onAddManual}
              className="px-6 rounded-xl bg-accent-gold text-black font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg shadow-accent-gold/10"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Selected employees list */}
      {selectedEmpleados.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-border">
          {selectedEmpleados.map((emp) => (
            <div
              key={emp.legajo}
              className="inline-flex items-center gap-2.5 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-3.5 py-2 rounded-[0.9rem] text-[11px] font-black uppercase tracking-tight shadow-lg"
            >
              {emp.nombre_apellido}
              <button
                type="button"
                onClick={() => onRemove(emp.legajo)}
                className="hover:text-foreground p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5 stroke-[3px]" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[0.9rem] border border-border text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
          >
            <X className="w-3 h-3 stroke-[3px]" />
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}
