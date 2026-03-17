import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: "admin" | "viewer";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "viewer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "viewer";
  }
}
