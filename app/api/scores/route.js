import { sql } from "../../../lib/db";
import { requireAdmin } from "../../../lib/admin";

// GET /api/scores — marcador actual (gamescore). Filtra por ?status=live
// para solo los partidos en curso, igual que usan las pantallas de Partidos
// y Pronósticos del prototipo.
export async function GET(req) {
  const status = new URL(req.url).searchParams.get("status");

  const rows = status
    ? await sql(
        `select g.*, l.name as league_name
         from gamescore g
         join leagues l on l.id = g.league_id
         where g.status = $1
         order by g.kickoff_at asc`,
        [status]
      )
    : await sql(
        `select g.*, l.name as league_name
         from gamescore g
         join leagues l on l.id = g.league_id
         order by g.kickoff_at asc`
      );

  return Response.json({ ok: true, scores: rows });
}

// POST /api/scores — el job que sincroniza con API-Football (o el panel de
// administración) usa esto para escribir/actualizar un marcador.
export async function POST(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id, league_id, home_team, away_team, home_score, away_score, status, match_minute, kickoff_at } = await req.json();

  const rows = id
    ? await sql(
        `update gamescore set
           home_score = $2, away_score = $3, status = $4,
           match_minute = $5, updated_at = now()
         where id = $1
         returning *`,
        [id, home_score, away_score, status, match_minute]
      )
    : await sql(
        `insert into gamescore (league_id, home_team, away_team, home_score, away_score, status, match_minute, kickoff_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [league_id, home_team, away_team, home_score ?? null, away_score ?? null, status || "scheduled", match_minute || null, kickoff_at || null]
      );

  return Response.json({ ok: true, score: rows[0] });
}
