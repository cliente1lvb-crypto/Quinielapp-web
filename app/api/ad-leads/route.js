import { sql } from "../../../lib/db";
import { ok, fail, readJson } from "../../../lib/me";

export const dynamic = "force-dynamic";

// POST /api/ad-leads — formulario "Anúnciate con nosotros". No requiere sesión.
export async function POST(req) {
  const b = await readJson(req);
  const company = String(b.company || "").trim().slice(0, 120);
  const email = String(b.email || "").trim().slice(0, 160);
  if (!company || !/^\S+@\S+\.\S+$/.test(email)) return fail("Escribe el nombre de tu empresa y un correo válido.");
  if (!process.env.DATABASE_URL) return ok({ demo: true });
  try {
    await sql("insert into ad_leads (company, email, placement) values ($1, $2, $3)",
      [company, email, String(b.placement || "").slice(0, 40) || null]);
    return ok();
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
