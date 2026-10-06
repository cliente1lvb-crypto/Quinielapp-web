// Configuración central de NextAuth. Se importa tanto desde la ruta de la API
// (app/api/auth/[...nextauth]/route.js) como desde cualquier server component
// que necesite leer la sesión con getServerSession(authOptions).
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql } from "./db";

export const authOptions = {
  providers: [
    // "etc" queda resuelto por diseño: agregar otro proveedor (Apple, X...) es
    // copiar uno de estos bloques con sus propias keys — nada más cambia.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Producción: solo usuarios reales guardados en Neon.
        if (!process.env.DATABASE_URL) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const rows = await sql("select * from users where lower(email) = $1", [email]);
        const user = rows[0];
        if (!user || !user.password_hash) return null; // cuenta OAuth sin password, o no existe

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.avatar_url };
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/" }, // usamos nuestra propia pantalla de login, no la de NextAuth

  callbacks: {
    // Cuando alguien entra por Google o Facebook, aseguramos que exista su fila
    // en la tabla `users` de Neon (la misma que ya usan /api/users y el resto
    // de la app) — así todo login, sea el que sea, termina en el mismo lugar.
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        const email = String(user.email || "").trim().toLowerCase();
        // Algunas cuentas de Facebook se registraron con teléfono y no tienen correo.
        if (!email) return "/?error=NoEmail";
        try {
          const existing = await sql("select id from users where lower(email) = $1", [email]);
          if (existing[0]) {
            await sql("update users set avatar_url = coalesce($2, avatar_url), oauth_provider = coalesce(oauth_provider, $3) where id = $1",
              [existing[0].id, user.image || null, account.provider]);
          } else {
            await sql(
              `insert into users (name, email, avatar_url, oauth_provider) values ($1, $2, $3, $4)`,
              [user.name || email.split("@")[0], email, user.image || null, account.provider]
            );
          }
        } catch (e) {
          console.error("signIn OAuth:", e);
          return "/?error=DbError";
        }
      }
      return true;
    },

    // Guarda de qué proveedor vino la sesión, para que la pantalla de
    // "encontramos a tus amigos" solo se muestre tras un login de Facebook real.
    async jwt({ token, account }) {
      if (account) token.provider = account.provider;
      return token;
    },
    async session({ session, token }) {
      session.provider = token.provider;
      return session;
    },
  },
};
