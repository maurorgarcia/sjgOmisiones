import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // Viewers cannot access /carga, /reportes, or /importar
    if (role === "viewer" && (path.startsWith("/carga") || path.startsWith("/reportes") || path.startsWith("/importar"))) {
      return NextResponse.redirect(new URL("/", req.url));
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
  // Protect all routes under / (except /login and the api endpoints via regexp if needed, but NextAuth ignores /api/auth)
  matcher: ["/((?!login|_next|api/auth).*)"],
};
