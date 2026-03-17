"use client";

import { useMemo, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { useTheme } from "next-themes";
import { ErrorCarga } from "@/types";

interface StatsChartsProps {
  data: ErrorCarga[];
}

const DARK_COLORS = [
  "#fbbf24", // amber-400
  "#f59e0b", // amber-500
  "#d97706", // amber-600
  "#b45309", // amber-700
  "#92400e", // amber-800
  "#78350f", // amber-900
];

const LIGHT_COLORS = [
  "#d97706", // amber-600
  "#f59e0b", // amber-500
  "#fbbf24", // amber-400
  "#fcd34d", // amber-300
  "#fbbf24", // amber-400
  "#d97706", // amber-600
];

export function StatsCharts({ data }: StatsChartsProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");
  const currentColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // 1. Data for Daily Chart (Last 14 days)
  const dailyData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        key: format(date, "yyyy-MM-dd"),
        name: format(date, "dd/MM"),
        total: 0,
      };
    });

    data.forEach((err) => {
      const errDateKey = format(parseISO(err.fecha), "yyyy-MM-dd");
      const day = days.find((d) => d.key === errDateKey);
      if (day) day.total += 1;
    });

    return days;
  }, [data]);

  // 2. Data for Motives Chart
  const motivesData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((err) => {
      counts[err.motivo_error] = (counts[err.motivo_error] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // 3. Data for Top OTs
  const otData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((err) => {
      if (err.ot) {
        counts[err.ot] = (counts[err.ot] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: `OT ${name}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data]);

  if (data.length === 0) return null;

  const tooltipStyle = {
    backgroundColor: isDark ? "#0a0c10" : "#ffffff",
    borderRadius: "16px",
    border: `1px solid ${isDark ? "rgba(251,191,36,0.2)" : "rgba(217,119,6,0.2)"}`,
    boxShadow: isDark ? "0 20px 25px -5px rgb(0 0 0 / 0.8)" : "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    fontSize: "11px",
    fontWeight: "bold",
    color: isDark ? "#f8fafc" : "#1e293b",
  };

  const axisStyle = {
    fill: isDark ? "#475569" : "#64748b",
    fontSize: 10,
    fontWeight: isDark ? "normal" : "600",
  };

  const gridStroke = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.05)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Daily Chart */}
      <div className="bg-card/40 p-5 rounded-3xl border border-border shadow-2xl flex flex-col hover:border-accent-gold/20 transition-all duration-300 group">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] group-hover:text-accent-gold/50 transition-colors">Omisiones últimos 14 días</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisStyle} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
              <Tooltip 
                cursor={{ fill: isDark ? 'rgba(251,191,36,0.05)' : 'rgba(217,119,6,0.05)', radius: 8 }}
                contentStyle={tooltipStyle}
                itemStyle={{ color: isDark ? '#fbbf24' : '#d97706' }}
              />
              <Bar dataKey="total" fill="url(#colorTotal)" radius={[6, 6, 0, 0]} barSize={16}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? "#fbbf24" : "#d97706"} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={isDark ? "#d97706" : "#b45309"} stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top OTs Chart */}
      <div className="bg-card/40 p-5 rounded-3xl border border-border shadow-2xl flex flex-col hover:border-accent-gold/20 transition-all duration-300 group">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] group-hover:text-accent-gold/50 transition-colors">Top 5 OTs con más omisiones</h3>
        <div className="h-[200px] w-full mt-auto">
          {otData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={otData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={axisStyle} width={80} />
                <Tooltip 
                  cursor={{ fill: isDark ? 'rgba(251,191,36,0.05)' : 'rgba(217,119,6,0.05)', radius: 8 }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: isDark ? '#fbbf24' : '#d97706' }}
                />
                <Bar dataKey="value" fill={isDark ? "#fbbf24" : "#d97706"} radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-[10px] font-black uppercase tracking-widest bg-sidebar/20 rounded-2xl border border-dashed border-border">
              No hay datos de OTs
            </div>
          )}
        </div>
      </div>

      {/* Motives Chart */}
      <div className="bg-card/40 p-5 rounded-3xl border border-border shadow-2xl flex flex-col hover:border-accent-gold/20 transition-all duration-300 group">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] group-hover:text-accent-gold/50 transition-colors">Distribución por Motivo</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={motivesData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" animationBegin={0} animationDuration={1000} stroke="none">
                {motivesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={tooltipStyle}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', paddingTop: '10px', fontWeight: '700', color: isDark ? '#475569' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
