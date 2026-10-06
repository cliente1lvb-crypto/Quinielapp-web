// Utilidades compartidas por las rutas de API que necesitan saber quién es el
// usuario con sesión (NextAuth) y su fila en la tabla `users` de Neon.
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { sql } from "./db";

export const ok = (data = {}) => Response.json({ ok: true, ...data });
export const fail = (error, status = 400, extra = {}) => Response.json({ ok: false, error, ...extra }, { status });

// Devuelve { me } o { error: Response }. Sin DATABASE_URL (modo de pruebas con
// las cuentas Demo) responde 503 con demo:true para que el cliente siga usando
// los datos de ejemplo en vez de tronar.
export async function requireMe() {
  if (!process.env.DATABASE_URL) {
    return { error: fail("Modo de pruebas: no hay base de datos conectada.", 503, { demo: true }) };
  }
  const session = await getServerSession(authOptions);
  const email = String(session?.user?.email || "").trim().toLowerCase();
  if (!email) return { error: fail("Inicia sesión para continuar.", 401) };
  const rows = await sql(
    "select id, name, email, avatar, avatar_url, plan from users where lower(email) = $1",
    [email]
  );
  if (!rows[0]) return { error: fail("Tu usuario no existe en la base de datos.", 401) };
  return { me: rows[0] };
}

export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}
