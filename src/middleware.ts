import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // Viewers cannot access /carga, /reportes, or /importar
    if (role === "viewer") {
      if (path === "/") {
        return NextResponse.redirect(new URL("/reporte", req.url));
      }
      if (path.startsWith("/carga") || path.startsWith("/reporte/") || path.startsWith("/importar")) {
        return NextResponse.redirect(new URL("/reporte", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protect all routes except login, public assets, and common static files
  matcher: ["/((?!login|_next|api/auth|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)"],
};
