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

        const rows = await sql("select * from users where email = $1", [credentials.email]);
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
        await sql(
          `insert into users (name, email, avatar_url, oauth_provider)
           values ($1, $2, $3, $4)
           on conflict (email) do update set avatar_url = excluded.avatar_url`,
          [user.name || "Sin nombre", user.email, user.image || null, account.provider]
        );
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
