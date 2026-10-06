import { sql } from "../../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../../lib/me";
import { listQuinielasFor } from "../../../../lib/quinielas";

export const dynamic = "force-dynamic";

const cleanCode = (raw) => (String(raw || "").trim().split(/[=/]/).pop() || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

// GET /api/quinielas/join?code=X — vista previa de la invitación (sin unirse todavía).
export async function GET(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const code = cleanCode(new URL(req.url).searchParams.get("code"));
  if (!code) return fail("Escribe el código de la quiniela.");
  try {
    const rows = await sql(
      `select q.id, q.name, q.emoji, q.code, q.max_members, u.name as owner,
              (select count(*)::int from quiniela_members m where m.quiniela_id = q.id) as members,
              exists(select 1 from quiniela_members m where m.quiniela_id = q.id and m.user_id = $2) as is_member,
              (select count(*)::int from quiniela_games g where g.quiniela_id = q.id) as games
         from quinielas q join users u on u.id = q.owner_id where q.code = $1`,
      [code, me.id]
    );
    const q = rows[0];
    if (!q) return fail("No encontramos ninguna quiniela con ese código.", 404);
    return ok({
      invite: { id: q.id, code: q.code, name: q.name, emoji: q.emoji, owner: q.owner, members: q.members, max: q.max_members, games: q.games },
      alreadyMember: q.is_member, full: !q.is_member && q.members >= q.max_members,
    });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// POST /api/quinielas/join — { code } (acepta el código o el link completo)
export async function POST(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const body = await readJson(req);
  const raw = String(body.code || "").trim();
  const code = (raw.split(/[=/]/).pop() || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!code) return fail("Escribe el código de la quiniela.");

  try {
    const rows = await sql(
      `select q.*, (select count(*)::int from quiniela_members m where m.quiniela_id = q.id) as members
         from quinielas q where q.code = $1`,
      [code]
    );
    const q = rows[0];
    if (!q) return fail("No encontramos ninguna quiniela con ese código.", 404);

    const already = await sql(
      "select 1 from quiniela_members where quiniela_id = $1 and user_id = $2",
      [q.id, me.id]
    );
    if (!already.length) {
      if (q.members >= q.max_members) return fail("Esa quiniela ya está llena.", 409);
      await sql(
        "insert into quiniela_members (quiniela_id, user_id) values ($1, $2) on conflict do nothing",
        [q.id, me.id]
      );
      if (q.owner_id !== me.id) {
        await sql(
          "insert into notifications (user_id, icon, title) values ($1, '🎉', $2)",
          [q.owner_id, `${me.name} se unió a "${q.name}"`]
        );
      }
    }
    const [shaped] = await listQuinielasFor(me.id, q.id);
    return ok({ quiniela: shaped, alreadyMember: !!already.length });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
