import { sql } from "../../../../lib/db";
import { ok, fail, readJson } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

// GET — partidos de todas las quinielas, agrupados (el mismo partido puede estar
// en muchas quinielas: al capturar el marcador se actualiza en todas).
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const rows = await sql(`
      with grp as (
        select home_team, away_team, coalesce(league, '') as league, coalesce(kickoff_label, '') as kickoff_label,
               bool_or(status = 'live') as any_live,
               bool_and(status = 'finished') as all_finished,
               max(home_score) as home_score, max(away_score) as away_score, max(match_minute) as match_minute,
               count(*)::int as quinielas
          from quiniela_games
         group by home_team, away_team, coalesce(league, ''), coalesce(kickoff_label, '')
      ), pc as (
        select g.home_team, g.away_team, coalesce(g.kickoff_label, '') as kickoff_label, count(*)::int as n
          from quiniela_games g join predictions p on p.quiniela_game_id = g.id
         group by g.home_team, g.away_team, coalesce(g.kickoff_label, '')
      )
      select grp.*, coalesce(pc.n, 0) as predictions
        from grp left join pc using (home_team, away_team, kickoff_label)
       order by grp.all_finished, grp.any_live desc, grp.home_team
       limit 200`);
    return ok({
      games: rows.map(r => ({
        key: `${r.home_team}|${r.away_team}|${r.kickoff_label}`,
        home: r.home_team, away: r.away_team, league: r.league, label: r.kickoff_label,
        status: r.all_finished ? "finished" : r.any_live ? "live" : "scheduled",
        hs: r.home_score, as: r.away_score, minute: r.match_minute,
        quinielas: r.quinielas, predictions: r.predictions,
      })),
    });
  } catch (e) { return fail(String(e.message || e), 500); }
}

// PATCH — { home, away, label, hs, as, status, minute }
export async function PATCH(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = await readJson(req);
  const status = ["scheduled", "live", "finished"].includes(b.status) ? b.status : null;
  if (!b.home || !b.away || !status) return fail("Datos incompletos.");
  const hs = status === "scheduled" ? null : Math.max(0, parseInt(b.hs, 10) || 0);
  const as = status === "scheduled" ? null : Math.max(0, parseInt(b.as, 10) || 0);
  try {
    const r = await sql(
      `update quiniela_games set home_score = $4, away_score = $5, status = $6, match_minute = $7
        where home_team = $1 and away_team = $2 and coalesce(kickoff_label, '') = $3
        returning quiniela_id`,
      [b.home, b.away, String(b.label || ""), hs, as, status, status === "live" ? String(b.minute || "").slice(0, 10) || null : null]
    );
    return ok({ updated: r.length });
  } catch (e) { return fail(String(e.message || e), 500); }
}
