import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ✅ FIX: agregado /empleados — antes un viewer podía acceder escribiendo la URL directo
const ADMIN_ONLY_PATHS = [
  "/carga",
  "/importar",
  "/empleados",
  "/faltantes/carga",
];

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (role === "viewer") {
      if (path === "/") {
        return NextResponse.redirect(new URL("/reporte", req.url));
      }

      const isAdminOnly = ADMIN_ONLY_PATHS.some(
        (p) => path === p || path.startsWith(p + "/")
      );

      if (isAdminOnly) {
        return NextResponse.redirect(new URL("/reporte", req.url));
      }

      if (path === "/faltantes") {
        return NextResponse.redirect(new URL("/faltantes/reporte", req.url));
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
  matcher: [
    "/((?!login|_next|api/auth|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
