"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = new FormData(e.currentTarget);
    const username = data.get("username") as string;
    const password = data.get("password") as string;

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_0%_0%,rgba(99,102,241,0.08)_0,transparent_50%),radial-gradient(at_100%_0%,rgba(168,85,247,0.05)_0,transparent_50%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Branding */}
        <div className="mb-8 text-center flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          >
            <Image 
              src="/logo-sjg.png" 
              alt="SJG Logo" 
              width={200}
              height={56}
              className="h-14 w-auto object-contain"
              priority
            />
          </motion.div>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
          {/* Header */}
          <div className="px-10 pt-10 pb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">Bienvenido</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium text-center">
              Ingresá tus credenciales para gestionar las omisiones.
            </p>
          </div>

          {/* Form */}
          <div className="px-10 pb-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-3"
                  >
                    <div className="bg-white p-1 rounded-full shadow-sm text-red-500">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">
                  Usuario
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all"
                    placeholder="Ej: rrhh"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-[0.1em] ml-1">
                  Contraseña
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all shadow-[0_12px_24px_-8px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ShieldCheck className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-slate-400">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/60">
            SJG Montajes Industriales · {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
            <span className="text-[9px] font-bold uppercase tracking-tighter">Powered by</span>
            <Image src="/logo-gdai.png" alt="GDAI" width={60} height={16} className="h-4 w-auto object-contain" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
