"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ShieldCheck, CheckCircle2, Clock, FileSpreadsheet, KeyRound } from "lucide-react";
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
    <div className="min-h-screen bg-[#0a0c10] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left side: Branding & Info */}
      <div className="hidden md:flex md:w-1/2 lg:w-[60%] bg-[#0a0c10] relative flex-col justify-between p-12 lg:p-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-amber-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        </div>

        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
           className="relative z-10"
        >
          <Image 
            src="/logo-sjg.png" 
            alt="SJG Logo" 
            width={240}
            height={72}
            className="h-16 w-auto object-contain invert brightness-0 mb-12"
            priority
          />
          
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">horas</span> <br />
            y fichadas
          </h1>
          
          <p className="text-slate-400 text-lg lg:text-xl max-w-lg mb-10 leading-relaxed font-medium">
            Sistema inteligente para el control y resolución eficiente de omisiones administrativas.
          </p>

          <div className="space-y-5">
            {[
              { icon: Clock, text: "Control en tiempo real", desc: "Monitoreo constante de registros pendientes." },
              { icon: FileSpreadsheet, text: "Reportes Automatizados", desc: "Exportación directa a Excel y envío por Email." },
              { icon: KeyRound, text: "Acceso Seguro", desc: "Validación de credenciales interna y protegida." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-4 group"
              >
                <div className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-amber-500/50 transition-colors">
                  <item.icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{item.text}</h3>
                  <p className="text-slate-500 text-sm">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className="relative z-10 flex items-center gap-4 border-t border-white/5 pt-8"
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">SJG Montajes Industriales · {new Date().getFullYear()}</span>
        </motion.div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0c10] md:bg-transparent relative">
        {/* Mobile-only background decor */}
        <div className="md:hidden absolute inset-0 bg-[#0a0c10] -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px] relative"
        >
          <div className="md:hidden flex justify-center mb-10">
            <Image src="/logo-sjg.png" alt="SJG Logo" width={180} height={54} className="h-12 w-auto object-contain invert" />
          </div>

          <div className="bg-[#111418] border border-white/5 md:border-white/[0.08] backdrop-blur-xl rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Header */}
            <div className="px-8 lg:px-12 pt-10 lg:pt-14 pb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">Ingresar</h2>
              <p className="text-slate-500 text-sm font-medium">Inicie sesión para acceder al panel de control.</p>
            </div>

            <div className="px-8 lg:px-12 pb-10 lg:pb-14">
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-3"
                    >
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Usuario</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-amber-400">
                      <User className="w-5 h-5 text-slate-600" />
                    </div>
                    <input
                      name="username"
                      type="text"
                      required
                      className="w-full bg-[#0a0c10]/50 border border-white/[0.05] text-white rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all placeholder-slate-700"
                      placeholder="Nombre de usuario"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-amber-400">
                      <Lock className="w-5 h-5 text-slate-600" />
                    </div>
                    <input
                      name="password"
                      type="password"
                      required
                      className="w-full bg-[#0a0c10]/50 border border-white/[0.05] text-white rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all placeholder-slate-700"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full overflow-hidden relative group mt-4 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-amber-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-full h-full bg-[#111418]/10 group-hover:bg-transparent rounded-[15px] flex items-center justify-center transition-all">
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold tracking-tight">Ingresar</span>
                        <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <CheckCircle2 className="w-4 h-4 text-white/70" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.button>
              </form>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 md:opacity-50">
             <div className="flex items-center gap-2 border-t border-white/5 pt-6 group">
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Powered by</span>
                <Image src="/logo-gdai.png" alt="GDAI" width={100} height={28} className="h-6 w-auto object-contain invert brightness-0 opacity-40 group-hover:opacity-100 transition-opacity" />
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
