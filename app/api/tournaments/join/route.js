import { sql } from "../../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../../lib/me";

export const dynamic = "force-dynamic";

// POST /api/tournaments/join — { id }
export async function POST(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const b = await readJson(req);
  try {
    const t = await sql(`select t.*, (select count(*)::int from tournament_entries e where e.tournament_id = t.id) as players
                           from tournaments t where t.id = $1`, [b.id]);
    if (!t[0]) return fail("Torneo no encontrado.", 404);
    if (!["open", "running"].includes(t[0].status)) return fail("Este torneo ya no acepta inscripciones.", 409);
    if (t[0].max_players && t[0].players >= t[0].max_players) return fail("El torneo ya está lleno.", 409);
    await sql("insert into tournament_entries (tournament_id, user_id) values ($1, $2) on conflict do nothing", [b.id, me.id]);
    return ok();
  } catch (e) { return fail(String(e.message || e), 500); }
}
