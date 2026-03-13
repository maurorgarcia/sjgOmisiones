import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Acceso Interno",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Fetch user from Supabase
        const { data: user, error } = await supabase
          .from("usuarios")
          .select("*")
          .eq("username", credentials.username)
          .single();

        if (error || !user) return null;

        // Check password (plain text just for this MVP, normally hashed)
        if (user.password_hash !== credentials.password) return null;

        return {
          id: user.id.toString(),
          name: user.nombre,
          email: user.username,
          role: user.role, // "admin" | "viewer"
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
