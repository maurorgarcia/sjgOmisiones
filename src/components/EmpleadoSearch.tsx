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
  searchRef, searchQuery, suggestions, selectedEmpleados,
  searchLoading, showSuggestions, legajoManual, errors,
  onSearch, onFocus, onSelect, onAddManual, onRemove, onClear, onLegajoChange,
}: EmpleadoSearchProps) {
  const hasError = !!errors.empleado || !!errors.legajo;

  return (
    <div className="space-y-1.5" ref={searchRef}>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-muted mb-1.5">
        Empleado <span className="text-red-400 ml-0.5">*</span>
      </label>

      {/* Input wrapper — relative solo acá para el dropdown */}
      <div className="relative">
        <div className={`relative h-10 bg-background border rounded-lg flex items-center transition-all focus-within:ring-2 focus-within:ring-accent-gold/30 focus-within:border-accent-gold ${
          hasError ? "border-red-400 bg-red-500/[0.03]" : "border-border"
        }`}>
          <Search className="absolute left-3 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={onFocus}
            placeholder="Buscar por nombre o legajo..."
            className="w-full h-full bg-transparent border-none pl-9 pr-10 outline-none text-sm font-normal placeholder:text-muted text-foreground"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 w-3.5 h-3.5 text-accent-gold animate-spin" />
          )}
          {searchQuery && !searchLoading && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-3 p-0.5 text-muted hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="max-h-[220px] overflow-y-auto">
              {suggestions.map((emp) => (
                <button
                  key={emp.legajo}
                  type="button"
                  onClick={() => onSelect(emp)}
                  className="w-full text-left px-4 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors flex items-center justify-between border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.nombre_apellido}</p>
                    <p className="text-[10px] text-muted mt-0.5">Legajo: {emp.legajo}</p>
                  </div>
                  <span className="text-[10px] font-medium text-muted bg-black/[0.05] dark:bg-white/[0.05] px-2 py-1 rounded-md ml-3 flex-shrink-0">
                    {emp.contrato}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results — manual entry */}
        {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
          <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-lg p-4 animate-in fade-in duration-150">
            <p className="text-xs text-muted mb-3">Empleado no encontrado. Ingresá el legajo manualmente:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={legajoManual}
                onChange={(e) => onLegajoChange(e.target.value)}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold transition-all"
                placeholder="Legajo SAP..."
              />
              <button
                type="button"
                onClick={onAddManual}
                className="px-4 rounded-lg bg-accent-gold hover:bg-accent-gold-dark text-white font-medium text-xs transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.empleado && <p className="text-red-500 text-[11px] font-medium">{errors.empleado}</p>}
      {errors.legajo && <p className="text-red-500 text-[11px] font-medium">{errors.legajo}</p>}

      {/* Selected employees */}
      {selectedEmpleados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {selectedEmpleados.map((emp) => (
            <div
              key={emp.legajo}
              className="inline-flex items-center gap-1.5 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-2.5 py-1 rounded-md text-xs font-medium"
            >
              {emp.nombre_apellido}
              <button type="button" onClick={() => onRemove(emp.legajo)} className="hover:text-foreground transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted hover:text-red-500 hover:border-red-300 hover:bg-red-500/[0.04] transition-all"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}
