import { sql } from "../../../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../../../lib/me";
import { listQuinielasFor, UUID_RE } from "../../../../../lib/quinielas";

export const dynamic = "force-dynamic";
const MAX_GAMES = 20;
const LOCK_MS = 30 * 60 * 1000; // los pronósticos se cierran 30 min antes del partido

// Solo el creador de la quiniela puede cambiar sus partidos.
async function ownerCheck(id, userId) {
  if (!UUID_RE.test(id)) return fail("Quiniela no válida.", 404);
  const r = await sql("select owner_id from quinielas where id = $1", [id]);
  if (!r[0]) return fail("Quiniela no encontrada.", 404);
  if (r[0].owner_id !== userId) return fail("Solo quien creó la quiniela puede editar los partidos.", 403);
  return null;
}

// POST /api/quinielas/:id/games — { games: [{ home, away, league, label, kickoffAt }] } agrega partidos.
export async function POST(req, { params }) {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    const bad = await ownerCheck(params.id, me.id);
    if (bad) return bad;
    const body = await readJson(req);
    const games = Array.isArray(body.games) ? body.games : [];
    if (!games.length) return fail("Elige al menos un partido.");
    const cur = await sql("select home_team, away_team, kickoff_at, sort_order from quiniela_games where quiniela_id = $1", [params.id]);
    if (cur.length + games.length > MAX_GAMES) return fail(`Una quiniela puede tener hasta ${MAX_GAMES} partidos.`);
    const key = (h, a) => `${String(h).toLowerCase()}|${String(a).toLowerCase()}`;
    const have = new Set(cur.map(g => key(g.home_team, g.away_team)));
    let order = cur.reduce((m, g) => Math.max(m, g.sort_order || 0), -1) + 1;
    let added = 0;
    for (const g of games) {
      const kickoff = g.kickoffAt && !isNaN(Date.parse(g.kickoffAt)) ? new Date(g.kickoffAt) : null;
      if (kickoff && kickoff.getTime() - LOCK_MS <= Date.now()) continue; // ya cerró (30 min antes del inicio)
      if (have.has(key(g.home, g.away))) continue;
      have.add(key(g.home, g.away));
      await sql(
        `insert into quiniela_games (quiniela_id, home_team, away_team, league, kickoff_label, kickoff_at, status, sort_order)
         values ($1, $2, $3, $4, $5, $6, 'scheduled', $7)`,
        [params.id, String(g.home || "Local").slice(0, 60), String(g.away || "Visitante").slice(0, 60),
         String(g.league || "").slice(0, 60), String(g.label || "").slice(0, 40), kickoff ? kickoff.toISOString() : null, order++]
      );
      added++;
    }
    const [quiniela] = await listQuinielasFor(me.id, params.id);
    return ok({ quiniela, added });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// DELETE /api/quinielas/:id/games?gameId=... — quita un partido que aún no empieza
// (sus pronósticos se borran con él).
export async function DELETE(req, { params }) {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    const bad = await ownerCheck(params.id, me.id);
    if (bad) return bad;
    const gameId = new URL(req.url).searchParams.get("gameId");
    if (!UUID_RE.test(gameId || "")) return fail("Partido no válido.", 404);
    const g = (await sql("select status, kickoff_at from quiniela_games where id = $1 and quiniela_id = $2", [gameId, params.id]))[0];
    if (!g) return fail("Partido no encontrado.", 404);
    if (g.status !== "scheduled" || (g.kickoff_at && new Date(g.kickoff_at).getTime() - LOCK_MS <= Date.now())) {
      return fail("Los pronósticos de ese partido ya cerraron; no se puede quitar.", 409);
    }
    const count = (await sql("select count(*)::int as n from quiniela_games where quiniela_id = $1", [params.id]))[0].n;
    if (count <= 1) return fail("La quiniela debe tener al menos un partido.", 409);
    await sql("delete from quiniela_games where id = $1", [gameId]);
    const [quiniela] = await listQuinielasFor(me.id, params.id);
    return ok({ quiniela });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
