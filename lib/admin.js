// Guardia para las rutas /api/admin/*: solo los correos de ADMIN_EMAILS.
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { sql } from "./db";
import { fail } from "./me";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return { error: fail("Inicia sesión.", 401) };
  if (!adminEmails().includes(email)) return { error: fail("No autorizado.", 403) };
  if (!process.env.DATABASE_URL) return { error: fail("No hay DATABASE_URL configurada.", 503) };
  let adminId = null;
  try {
    const r = await sql("select id from users where lower(email) = $1", [email]);
    adminId = r[0] ? r[0].id : null;
  } catch {}
  return { email, adminId };
}

// Corre una consulta y si falla (tabla que no existe, etc.) regresa el fallback
// junto con el error, para no tumbar todo el panel por un solo bloque.
export async function safe(fn, fallback) {
  try { return await fn(); } catch (e) { return { __error: String(e.message || e), ...(fallback || {}) }; }
}
