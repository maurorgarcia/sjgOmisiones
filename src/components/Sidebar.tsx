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
} from "lucide-react";
import Image from "next/image";

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
  { href: "/importar", label: "Importar Empleados", icon: Upload, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  if (!session) return null;

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col z-40 shadow-2xl">
      {/* Logo SJG */}
      <div className="px-5 py-6 border-b border-slate-700/50 flex items-center justify-center">
        <Image
          src="/logo-sjg.png"
          alt="SJG Montajes Industriales"
          width={180}
          height={60}
          className="w-full max-w-[180px] object-contain invert brightness-0"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-2">
          Gestión Errores
        </p>
        <div className="space-y-1 mb-6">
          {navItems.map((item) => <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />)}
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-2">
          Sección Faltantes
        </p>
        <div className="space-y-1 mb-6">
          {faltantesItems.map((item) => <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />)}
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-2">
          Sistema
        </p>
        <div className="space-y-1">
          {adminItems.map((item) => <NavItem key={item.href} item={item} isAdmin={isAdmin} pathname={pathname} />)}
        </div>
      </nav>

      {/* GDAI Credit */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <a
          href="https://www.godreamai.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
          title="Desarrollado por GDAI"
        >
          <span className="text-[10px] text-slate-400 tracking-wide uppercase font-semibold">Desarrollado por</span>
          <Image src="/logo-gdai.png" alt="GDAI" width={80} height={22} className="h-[22px] w-auto object-contain invert brightness-0" />
        </a>
      </div>

      {/* User info + Logout */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
            {(session.user?.name || session.user?.email || "U")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {session.user?.name || "Usuario"}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {session.user?.email || "RRHH"}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function NavItem({ item, isAdmin, pathname }: { item: any; isAdmin: boolean; pathname: string }) {
  const { href, label, icon: Icon, adminOnly } = item;
  if (adminOnly && !isAdmin) return null;

  const active = pathname === href;
  const isCarga = href === "/carga";

  return (
    <div className="group relative">
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 opacity-60'}`} />
        {label}
      </Link>
      
      {isCarga && isAdmin && (
        <button
          onClick={() => window.open("/carga/mini", "MiniCarga", "width=450,height=800,menubar=no,toolbar=no,location=no,status=no")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all opacity-0 group-hover:opacity-100"
          title="Abrir en ventana flotante"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
