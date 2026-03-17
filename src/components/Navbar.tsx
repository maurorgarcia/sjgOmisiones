"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogOut, Home, PlusCircle } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-black text-lg text-white tracking-tighter uppercase">
                SJG <span className="text-amber-500">Gestión</span>
              </span>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-slate-500 hover:text-amber-500 inline-flex items-center px-1 pt-1 border-b-2 text-[11px] font-black uppercase tracking-widest transition-colors gap-2"
              >
                <Home className="w-4 h-4" />
                Gestión
              </Link>
              <Link
                href="/carga"
                className="border-transparent text-slate-500 hover:text-amber-500 inline-flex items-center px-1 pt-1 border-b-2 text-[11px] font-black uppercase tracking-widest transition-colors gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Cargar
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:block">
              {session?.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="text-slate-500 hover:text-red-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
