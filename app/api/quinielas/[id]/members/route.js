import { sql } from "../../../../../lib/db";
import { requireMe, ok, fail } from "../../../../../lib/me";
import { isMember, UUID_RE } from "../../../../../lib/quinielas";

export const dynamic = "force-dynamic";

// DELETE /api/quinielas/:id/members?userId=... — el admin saca a alguien.
// Sin userId (o con tu propio id) = salirte de la quiniela.
export async function DELETE(req, { params }) {
  const { me, error } = await requireMe();
  if (error) return error;
  const id = params.id;
  const target = new URL(req.url).searchParams.get("userId") || me.id;
  if (!UUID_RE.test(id) || !UUID_RE.test(target)) return fail("Datos no válidos.", 404);
  try {
    const role = await isMember(id, me.id);
    if (!role) return fail("No eres miembro de esta quiniela.", 403);
    if (target !== me.id && role !== "owner") return fail("Solo el admin puede quitar miembros.", 403);
    if (target === me.id && role === "owner") return fail("Eres el admin: no puedes salirte de tu propia quiniela.", 409);
    await sql("delete from quiniela_members where quiniela_id = $1 and user_id = $2", [id, target]);
    return ok();
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
