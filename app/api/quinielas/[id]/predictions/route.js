import { sql } from "../../../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../../../lib/me";
import { isMember, UUID_RE } from "../../../../../lib/quinielas";

export const dynamic = "force-dynamic";

// POST /api/quinielas/:id/predictions — { gameId, home, away }
// Solo se puede pronosticar (o cambiar) antes de que arranque el partido.
export async function POST(req, { params }) {
  const { me, error } = await requireMe();
  if (error) return error;
  const id = params.id;
  const body = await readJson(req);
  const home = parseInt(body.home, 10);
  const away = parseInt(body.away, 10);
  if (!UUID_RE.test(id) || !UUID_RE.test(String(body.gameId || ""))) return fail("Partido no válido.", 404);
  if (!(home >= 0 && home <= 20 && away >= 0 && away <= 20)) return fail("Marcador no válido.");
  try {
    if (!(await isMember(id, me.id))) return fail("No eres miembro de esta quiniela.", 403);
    const g = await sql(
      "select status, kickoff_at from quiniela_games where id = $1 and quiniela_id = $2",
      [body.gameId, id]
    );
    if (!g[0]) return fail("Ese partido no es de esta quiniela.", 404);
    if (g[0].status !== "scheduled" || (g[0].kickoff_at && new Date(g[0].kickoff_at) <= new Date())) {
      return fail("Este partido ya arrancó: los pronósticos están cerrados.", 409);
    }
    await sql(
      `insert into predictions (quiniela_game_id, user_id, home_pred, away_pred)
       values ($1, $2, $3, $4)
       on conflict (quiniela_game_id, user_id)
       do update set home_pred = excluded.home_pred, away_pred = excluded.away_pred, updated_at = now()`,
      [body.gameId, me.id, home, away]
    );
    return ok({ pick: { h: home, a: away, saved: true } });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
