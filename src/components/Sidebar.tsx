"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  LogOut,
  Upload,
  Maximize2,
  Users2,
  ClipboardList,
  Menu,
  X,
  Wifi,
  WifiOff,
  UserSquare2,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function useRealtimeStatus() {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    const channel = supabase
      .channel("sidebar-health")
      .on("postgres_changes", { event: "*", schema: "public", table: "error_carga" }, () => {})
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("disconnected");
        else setStatus("connecting");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  return status;
}

const navItems = [
  { href: "/", label: "Gestión Administrativa", icon: LayoutDashboard, adminOnly: true },
  { href: "/reporte", label: "Vista de Reporte", icon: FileSpreadsheet, adminOnly: false },
  { href: "/carga", label: "Cargar Error", icon: PlusCircle, adminOnly: true },
];

const faltantesItems = [
  { href: "/faltantes", label: "Gestión Faltantes", icon: ClipboardList, adminOnly: true },
  { href: "/faltantes/reporte", label: "Reporte Faltantes", icon: Users2, adminOnly: false },
  { href: "/faltantes/carga", label: "Cargar Faltante", icon: PlusCircle, adminOnly: true },
];

const adminItems = [
  { href: "/empleados", label: "Base de Personal", icon: UserSquare2, adminOnly: true },
  { href: "/importar", label: "Importar Empleados", icon: Upload, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isAdmin = session?.user?.role === "admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const realtimeStatus = useRealtimeStatus();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (!session) return null;

  const sidebarContent = (
    <aside className="h-full w-64 bg-sidebar text-foreground flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)] border-r border-border transition-colors duration-300">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border flex items-center justify-between">
        <Image
          src="/logo-sjg.png"
          alt="SJG Montajes Industriales"
          width={180}
          height={60}
          className={`w-full max-w-[150px] object-contain transition-all duration-300 ${theme === "dark" ? "invert brightness-0" : ""}`}
        />
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-3 mb-2 opacity-80">
          Gestión Errores
        </p>
        <div className="space-y-1 mb-6">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />
          ))}
        </div>

        <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-3 mb-2 opacity-80">
          Sección Faltantes
        </p>
        <div className="space-y-1 mb-6">
          {faltantesItems.map((item) => (
            <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />
          ))}
        </div>

        <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-3 mb-2 opacity-80">
          Sistema
        </p>
        <div className="space-y-1">
          {adminItems.map((item) => (
            <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />
          ))}
        </div>
      </nav>

      {/* GDAI Credit */}
      <div className="px-4 py-4 border-t border-border">
        <a
          href="https://www.godreamai.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
          title="Desarrollado por GDAI"
        >
          <span className="text-[9px] text-slate-500 tracking-widest uppercase font-black opacity-70">
            Desarrollado por
          </span>
          <Image
            src="/logo-gdai.png"
            alt="GDAI"
            width={80}
            height={22}
            className={`h-[22px] w-auto object-contain transition-all duration-300 ${theme === "dark" ? "invert brightness-0" : ""}`}
          />
        </a>
      </div>

      {/* User info + Logout */}
      <div className="px-3 py-4 border-t border-border bg-sidebar/50">
        {/* Realtime status */}
        <div className="flex items-center gap-2 px-3 mb-3">
          {realtimeStatus === "connected" ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : realtimeStatus === "connecting" ? (
            <Wifi className="w-3 h-3 text-amber-400 animate-pulse" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span
            className={`text-[9px] font-black uppercase tracking-widest ${
              realtimeStatus === "connected"
                ? "text-emerald-500"
                : realtimeStatus === "connecting"
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {realtimeStatus === "connected"
              ? "En vivo"
              : realtimeStatus === "connecting"
                ? "Conectando…"
                : "Sin conexión"}
          </span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-card border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-black uppercase flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            {(session.user?.name || session.user?.email || "U")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate tracking-tight">
              {session.user?.name || "Usuario"}
            </p>
            <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">
              {session.user?.role === "admin" ? "Administrador" : "Visualizador"}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all font-medium"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-card border border-border shadow-lg text-foreground hover:bg-accent-gold hover:text-black hover:border-transparent transition-all active:scale-95"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-full w-64 z-40">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 35 }}
              className="fixed top-0 left-0 h-full w-64 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavItem({
  item,
  isAdmin,
  pathname,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly: boolean };
  isAdmin: boolean;
  pathname: string;
}) {
  const { href, label, icon: Icon, adminOnly } = item;
  if (adminOnly && !isAdmin) return null;

  const active = pathname === href;
  const isCarga = href === "/carga";

  return (
    <div className="group relative">
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative group/link ${
          active
            ? "bg-gradient-to-r from-accent-gold to-accent-gold-dark text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            : "text-slate-600 dark:text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
        }`}
      >
        <div className="absolute inset-0 rounded-xl transition-opacity duration-500 opacity-0 group-hover/link:opacity-100 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
        <Icon
          className={`w-4 h-4 flex-shrink-0 relative z-10 ${
            active
              ? "text-black"
              : "text-slate-600 dark:text-slate-500 group-hover/link:text-accent-gold group-hover/link:scale-110 transition-all"
          }`}
        />
        <span className="relative z-10 tracking-tight font-black uppercase text-[11px]">{label}</span>
        {active && (
          <motion.div
            layoutId="activeNav"
            className="absolute left-[-12px] w-1.5 h-6 bg-amber-400 rounded-r-full shadow-[0_0_12px_rgba(251,191,36,0.8)]"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </Link>

      {(isCarga || href === "/faltantes/carga") && isAdmin && (
        <button
          onClick={() =>
            window.open(
              href === "/carga" ? "/carga/mini" : "/faltantes/mini",
              href === "/carga" ? "MiniCarga" : "MiniFaltantes",
              "width=450,height=800,menubar=no,toolbar=no,location=no,status=no"
            )
          }
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1"
          title="Abrir en ventana flotante"
        >
          <div className="h-3 w-[1px] bg-border mr-1" />
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
