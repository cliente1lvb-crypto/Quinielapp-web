import { sql } from "../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../lib/me";

export const dynamic = "force-dynamic";

// GET /api/me — mi perfil.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  return ok({ me: { id: me.id, name: me.name, email: me.email, avatar: me.avatar || "🦁", avatarUrl: me.avatar_url, plan: me.plan } });
}

// PATCH /api/me — { name?, avatar? }
export async function PATCH(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const b = await readJson(req);
  const name = b.name !== undefined ? String(b.name).trim().slice(0, 60) : me.name;
  const avatar = b.avatar !== undefined ? String(b.avatar).slice(0, 8) : me.avatar;
  if (!name) return fail("Tu nombre no puede quedar vacío.");
  try {
    const rows = await sql(
      "update users set name = $1, avatar = $2 where id = $3 returning id, name, email, avatar, avatar_url, plan",
      [name, avatar, me.id]
    );
    const u = rows[0];
    return ok({ me: { id: u.id, name: u.name, email: u.email, avatar: u.avatar, avatarUrl: u.avatar_url, plan: u.plan } });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
