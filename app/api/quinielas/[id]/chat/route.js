import { sql } from "../../../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../../../lib/me";
import { isMember, UUID_RE } from "../../../../../lib/quinielas";

export const dynamic = "force-dynamic";

// POST /api/quinielas/:id/chat — { text, sticker? }
export async function POST(req, { params }) {
  const { me, error } = await requireMe();
  if (error) return error;
  const id = params.id;
  const body = await readJson(req);
  const text = String(body.text || "").trim().slice(0, 500);
  if (!UUID_RE.test(id)) return fail("Quiniela no válida.", 404);
  if (!text) return fail("El mensaje está vacío.");
  try {
    if (!(await isMember(id, me.id))) return fail("No eres miembro de esta quiniela.", 403);
    const rows = await sql(
      `insert into chat_messages (quiniela_id, user_id, body, is_sticker)
       values ($1, $2, $3, $4) returning id, created_at`,
      [id, me.id, text, !!body.sticker]
    );
    return ok({ message: { id: rows[0].id, userId: me.id, from: "Tú", text, sticker: !!body.sticker, me: true, at: rows[0].created_at } });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
