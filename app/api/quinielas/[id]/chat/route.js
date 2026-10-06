import { sql } from "../../../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../../../lib/me";
import { isMember, UUID_RE } from "../../../../../lib/quinielas";
import { notifyUsers, membersOf, once } from "../../../../../lib/push";

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
    // Push a los demás (máximo un aviso de chat cada 10 min por persona y quiniela).
    try {
      const q = (await sql("select name from quinielas where id = $1", [id]))[0];
      const slot = Math.floor(Date.now() / 600000);
      const to = [];
      for (const uid of await membersOf(id, me.id)) if (await once(`chat:${id}:${uid}:${slot}`)) to.push(uid);
      if (to.length) await notifyUsers(to, {
        title: `💬 ${me.name} en "${q ? q.name : "tu quiniela"}"`, body: body.sticker ? "Mandó un sticker" : text.slice(0, 120),
        url: `/?quiniela=${id}&tab=chat`, tag: `chat-${id}`,
      }, { inApp: false });
    } catch (e) { /* los avisos nunca deben romper el chat */ }
    return ok({ message: { id: rows[0].id, userId: me.id, from: "Tú", text, sticker: !!body.sticker, me: true, at: rows[0].created_at } });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
