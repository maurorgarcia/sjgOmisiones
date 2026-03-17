import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SJG Omisiones | Sistema de Gestión RRHH",
  description: "Sistema interno de gestión de omisiones y errores de fichaje - SJG Montajes",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-sans bg-slate-100 min-h-screen`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}

// Renders sidebar only when logged in (client component detects session)
import AppShell from "@/components/AppShell";
