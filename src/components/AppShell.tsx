"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { ViewerOnboarding } from "@/components/ViewerOnboarding";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const isLoginPage = pathname === "/login";
  const isMiniMode = pathname.endsWith("/mini");

  // ✅ FIX: localStorage se accede dentro del useEffect (solo en cliente)
  // Antes podía crashear en SSR porque se ejecutaba durante el render
  useEffect(() => {
    if (
      session?.user?.role === "viewer" &&
      typeof window !== "undefined" &&
      !localStorage.getItem("sjg_onboarding_seen")
    ) {
      setShowOnboarding(true);
    }
  }, [session]);

  const handleCloseOnboarding = () => {
    // ✅ FIX: guard de SSR también en el close handler
    if (typeof window !== "undefined") {
      localStorage.setItem("sjg_onboarding_seen", "true");
    }
    setShowOnboarding(false);
  };

  if (isLoginPage || !session || isMiniMode) {
    return (
      <>
        {children}
        <ViewerOnboarding show={showOnboarding} onClose={handleCloseOnboarding} />
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen p-4 sm:p-6 lg:p-8 overflow-hidden pt-16 lg:pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <ViewerOnboarding show={showOnboarding} onClose={handleCloseOnboarding} />
    </>
  );
}
