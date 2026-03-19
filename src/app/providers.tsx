"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // ✅ FIX FLASH DE TEMA: disableTransitionOnChange evita el parpadeo
    // al cambiar entre light/dark durante la hidratación inicial.
    // next-themes con attribute="class" y disableTransitionOnChange
    // aplica la clase antes del primer paint del browser.
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
