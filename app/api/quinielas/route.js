import { sql } from "../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../lib/me";
import { listQuinielasFor, newCode } from "../../../lib/quinielas";

export const dynamic = "force-dynamic";

// GET /api/quinielas — las quinielas donde soy miembro.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    return ok({ quinielas: await listQuinielasFor(me.id) });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// POST /api/quinielas — crea una quiniela con sus partidos. Quien la crea queda
// como dueño (admin) y primer miembro.
// body: { name, emoji?, max?, period?, games: [{ home, away, league, label, status, hs, as, kickoffAt }] }
export async function POST(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const body = await readJson(req);
  const name = String(body.name || "").trim().slice(0, 60);
  const games = Array.isArray(body.games) ? body.games.slice(0, 30) : [];
  const max = Math.min(100, Math.max(2, parseInt(body.max, 10) || 15));
  if (!name) return fail("Ponle nombre a tu quiniela.");
  if (!games.length) return fail("Elige al menos un partido.");

  try {
    let q = null;
    for (let i = 0; i < 5 && !q; i++) {
      const rows = await sql(
        `insert into quinielas (code, name, emoji, owner_id, max_members, period)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (code) do nothing
         returning *`,
        [newCode(), name, String(body.emoji || "🏆").slice(0, 8), me.id, max, String(body.period || "weekend").slice(0, 20)]
      );
      q = rows[0] || null;
    }
    if (!q) return fail("No se pudo generar el código de la quiniela, intenta de nuevo.", 500);

    await sql(
      "insert into quiniela_members (quiniela_id, user_id, role) values ($1, $2, 'owner')",
      [q.id, me.id]
    );
    for (let i = 0; i < games.length; i++) {
      const g = games[i] || {};
      const status = ["scheduled", "live", "finished"].includes(g.status) ? g.status : "scheduled";
      const hs = Number.isInteger(g.hs) ? g.hs : null;
      const as = Number.isInteger(g.as) ? g.as : null;
      const kickoff = g.kickoffAt && !isNaN(Date.parse(g.kickoffAt)) ? new Date(g.kickoffAt).toISOString() : null;
      await sql(
        `insert into quiniela_games
           (quiniela_id, home_team, away_team, league, kickoff_label, kickoff_at, home_score, away_score, status, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [q.id, String(g.home || "Local").slice(0, 60), String(g.away || "Visitante").slice(0, 60),
         String(g.league || "").slice(0, 60), String(g.label || "").slice(0, 40), kickoff,
         status === "scheduled" ? null : hs, status === "scheduled" ? null : as, status, i]
      );
    }
    const [shaped] = await listQuinielasFor(me.id, q.id);
    return ok({ quiniela: shaped });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
