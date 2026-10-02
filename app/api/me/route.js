import bcrypt from "bcryptjs";
import { sql } from "../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../lib/me";

export const dynamic = "force-dynamic";

function shape(u) {
  return {
    id: u.id, name: u.name, email: u.email, avatar: u.avatar || "🦁", avatarUrl: u.avatar_url, plan: u.plan,
    birthdate: u.birthdate ? new Date(u.birthdate).toISOString().slice(0, 10) : "",
    hasPassword: !!u.password_hash, provider: u.oauth_provider || "correo", createdAt: u.created_at,
  };
}

// GET /api/me — mi perfil.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  const r = await sql("select * from users where id = $1", [me.id]);
  return ok({ me: shape(r[0]) });
}

// PATCH /api/me — { name?, avatar?, birthdate?, currentPassword?, newPassword? }
export async function PATCH(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const b = await readJson(req);
  const cur = (await sql("select * from users where id = $1", [me.id]))[0];

  const name = b.name !== undefined ? String(b.name).trim().slice(0, 60) : cur.name;
  const avatar = b.avatar !== undefined ? String(b.avatar).slice(0, 8) : cur.avatar;
  let birthdate = cur.birthdate;
  if (b.birthdate !== undefined && b.birthdate !== "") {
    const d = new Date(b.birthdate);
    if (isNaN(d.getTime())) return fail("Fecha de nacimiento no válida.");
    if ((Date.now() - d.getTime()) / (365.25 * 864e5) < 18) return fail("Debes ser mayor de edad.");
    birthdate = b.birthdate;
  }
  if (!name) return fail("Tu nombre no puede quedar vacío.");

  let hash = cur.password_hash;
  if (b.newPassword !== undefined) {
    const np = String(b.newPassword || "");
    if (np.length < 8) return fail("La nueva contraseña debe tener al menos 8 caracteres.");
    if (cur.password_hash) {
      const valid = await bcrypt.compare(String(b.currentPassword || ""), cur.password_hash);
      if (!valid) return fail("Tu contraseña actual no es correcta.");
    }
    hash = await bcrypt.hash(np, 10);
  }

  try {
    const rows = await sql(
      "update users set name = $1, avatar = $2, birthdate = $3, password_hash = $4 where id = $5 returning *",
      [name, avatar, birthdate, hash, me.id]
    );
    return ok({ me: shape(rows[0]), passwordChanged: b.newPassword !== undefined });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// DELETE /api/me — elimina la cuenta y todo lo suyo (quinielas propias, pronósticos, chat...).
export async function DELETE() {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    await sql("delete from users where id = $1", [me.id]);
    return ok();
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
