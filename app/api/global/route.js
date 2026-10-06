import { sql } from "../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../lib/me";

export const dynamic = "force-dynamic";

async function currentDraw() {
  const rows = await sql(
    `select * from global_draws order by (status = 'open') desc, id desc limit 1`
  );
  return rows[0] || null;
}

// GET /api/global — sorteo vigente, sus partidos, mi boleto y el ranking.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    const draw = await currentDraw();
    if (!draw) return ok({ draw: null });
    const matches = await sql(
      "select n, home_team, away_team, league, result, kickoff_at from global_draw_matches where draw_id = $1 order by n",
      [draw.id]
    );
    const mine = await sql(
      "select picks, submitted_at from global_tickets where draw_id = $1 and user_id = $2",
      [draw.id, me.id]
    );
    const ranking = await sql(
      `select r.user_id, r.name, r.avatar, r.hits, t.submitted_at
         from global_ranking r
         join global_tickets t on t.draw_id = r.draw_id and t.user_id = r.user_id
        where r.draw_id = $1
        order by r.hits desc, t.submitted_at asc`,
      [draw.id]
    );
    const myIdx = ranking.findIndex(r => r.user_id === me.id);
    return ok({
      draw: { id: draw.id, closeLabel: draw.close_label, status: draw.status, closesAt: draw.closes_at },
      matches: matches.map(m => ({ n: m.n, home: m.home_team, away: m.away_team, league: m.league, result: m.result, kickoffAt: m.kickoff_at })),
      myTicket: mine[0] ? mine[0].picks : null,
      ranking: ranking.slice(0, 20).map((r, i) => ({
        rank: i + 1, name: r.user_id === me.id ? "Tú" : r.name, avatar: r.avatar || "🦁",
        aciertos: r.hits, streak: 0, me: r.user_id === me.id,
      })),
      me: myIdx >= 0 ? { rank: myIdx + 1, aciertos: ranking[myIdx].hits } : null,
      totalPlayers: ranking.length,
    });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// POST /api/global — { picks: { "1": "L", ..., "10": "V" } }
export async function POST(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const body = await readJson(req);
  try {
    const draw = await currentDraw();
    if (!draw || draw.status !== "open") return fail("El sorteo ya está cerrado.", 409);
    if (draw.closes_at && new Date(draw.closes_at) <= new Date()) return fail("El sorteo ya cerró.", 409);
    const matches = await sql("select n from global_draw_matches where draw_id = $1", [draw.id]);
    const picks = {};
    for (const { n } of matches) {
      const v = body.picks ? body.picks[n] ?? body.picks[String(n)] : null;
      if (!["L", "E", "V"].includes(v)) return fail(`Falta tu pronóstico del partido ${n}.`);
      picks[String(n)] = v;
    }
    await sql(
      `insert into global_tickets (draw_id, user_id, picks) values ($1, $2, $3::jsonb)
       on conflict (draw_id, user_id) do update set picks = excluded.picks, submitted_at = now()`,
      [draw.id, me.id, JSON.stringify(picks)]
    );
    return ok({ picks });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
