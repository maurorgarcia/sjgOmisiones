"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, PlusCircle, FileSpreadsheet, LogOut,
  Upload, Maximize2, Users2, ClipboardList, Menu, X,
  Wifi, WifiOff, UserSquare2,
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (!session) return null;

  const sidebarContent = (
    <aside className="h-full w-64 bg-sidebar text-foreground flex flex-col border-r border-border">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <Image
          src="/logo-sjg.png"
          alt="SJG Montajes Industriales"
          width={160}
          height={50}
          className={`w-full max-w-[130px] object-contain ${theme === "dark" ? "invert brightness-0" : ""}`}
        />
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">

        <div>
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider px-3 mb-1">
            Gestión Errores
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider px-3 mb-1">
            Faltantes
          </p>
          <div className="space-y-0.5">
            {faltantesItems.map((item) => (
              <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider px-3 mb-1">
            Sistema
          </p>
          <div className="space-y-0.5">
            {adminItems.map((item) => (
              <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />
            ))}
          </div>
        </div>
      </nav>

      {/* GDAI Credit */}
      <div className="px-4 py-3 border-t border-border">
        <a
          href="https://www.godreamai.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 opacity-40 hover:opacity-70 transition-opacity"
        >
          <span className="text-[9px] text-muted tracking-wider uppercase font-medium">Desarrollado por</span>
          <Image
            src="/logo-gdai.png"
            alt="GDAI"
            width={60}
            height={18}
            className={`h-[18px] w-auto object-contain ${theme === "dark" ? "invert brightness-0" : ""}`}
          />
        </a>
      </div>

      {/* User + Status */}
      <div className="px-3 py-3 border-t border-border">
        {/* Realtime status — más discreto */}
        <div className="flex items-center gap-1.5 px-3 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            realtimeStatus === "connected" ? "bg-emerald-500" :
            realtimeStatus === "connecting" ? "bg-amber-400 animate-pulse" :
            "bg-red-400"
          }`} />
          <span className="text-[10px] font-medium text-muted">
            {realtimeStatus === "connected" ? "En vivo" :
             realtimeStatus === "connecting" ? "Conectando…" : "Sin conexión"}
          </span>
        </div>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-border">
          <div className="w-8 h-8 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-xs font-semibold text-accent-gold uppercase flex-shrink-0">
            {(session.user?.name || session.user?.email || "U")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {session.user?.name || "Usuario"}
            </p>
            <p className="text-[10px] text-muted truncate">
              {session.user?.role === "admin" ? "Administrador" : "Visualizador"}
            </p>
          </div>
          <ThemeToggle />
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:bg-red-500/8 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm text-foreground hover:bg-accent-gold hover:text-black hover:border-transparent transition-all"
      >
        <Menu className="w-4 h-4" />
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
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
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
  const isCarga = href === "/carga" || href === "/faltantes/carga";

  return (
    <div className="group relative">
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
          active
            ? "bg-accent-gold/10 text-accent-gold font-semibold border border-accent-gold/20"
            : "text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-foreground font-medium"
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-accent-gold" : "text-muted group-hover:text-foreground transition-colors"}`} />
        <span className="truncate">{label}</span>
        {/* Indicador activo — línea lateral sutil */}
        {active && (
          <motion.div
            layoutId="activeNav"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-gold rounded-r-full"
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        )}
      </Link>

      {isCarga && isAdmin && (
        <button
          onClick={() =>
            window.open(
              href === "/carga" ? "/carga/mini" : "/faltantes/mini",
              href === "/carga" ? "MiniCarga" : "MiniFaltantes",
              "width=450,height=800,menubar=no,toolbar=no,location=no,status=no"
            )
          }
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-accent-gold hover:bg-accent-gold/10 rounded transition-all opacity-0 group-hover:opacity-100"
          title="Abrir en ventana flotante"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
