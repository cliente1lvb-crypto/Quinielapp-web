// Lectura de quinielas desde Neon y su conversión al formato que ya usa la
// interfaz (el mismo shape que los datos de ejemplo de QuinielappClient.js).
import { sql } from "./db";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I
export function newCode(len = 6) {
  let c = "";
  for (let i = 0; i < len; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return c;
}

export function shapeGame(g) {
  return {
    id: g.id,
    home: g.home_team,
    away: g.away_team,
    hs: g.home_score,
    as: g.away_score,
    live: g.status === "live",
    status: g.status,
    min: g.status === "live" ? (g.match_minute || "En vivo") : (g.kickoff_label || ""),
    league: g.league || "",
    closesAt: g.kickoff_at,
  };
}

function firstName(n) {
  return String(n || "").trim().split(/\s+/)[0] || "—";
}

export function shapeQuiniela(q, games, standings, userId) {
  const gs = games.map(shapeGame);
  const anyLive = gs.some(g => g.status === "live");
  const allDone = gs.length > 0 && gs.every(g => g.status === "finished");
  const hasPoints = standings.some(s => s.points > 0);
  const myIdx = standings.findIndex(s => s.user_id === userId);
  const leader = standings[0];
  return {
    id: q.id,
    db: true,
    code: q.code,
    name: q.name,
    emoji: q.emoji,
    members: q.members,
    max: q.max_members,
    status: allDone ? "Terminada" : anyLive ? "En vivo" : "Por comenzar",
    leader: hasPoints && leader ? (leader.user_id === userId ? "Tú" : firstName(leader.name)) : "—",
    you: hasPoints && myIdx >= 0 ? myIdx + 1 : null,
    isOwner: q.owner_id === userId,
    games: gs,
  };
}

// Todas las quinielas donde el usuario es miembro, ya con partidos y posiciones.
export async function listQuinielasFor(userId, onlyId = null) {
  const qs = await sql(
    `select q.*, (select count(*)::int from quiniela_members m2 where m2.quiniela_id = q.id) as members
       from quinielas q
       join quiniela_members m on m.quiniela_id = q.id and m.user_id = $1
      where ($2::uuid is null or q.id = $2::uuid)
      order by q.created_at desc`,
    [userId, onlyId]
  );
  if (!qs.length) return [];
  const ids = qs.map(q => q.id);
  const games = await sql(
    `select * from quiniela_games where quiniela_id = any($1::uuid[])
      order by sort_order, kickoff_at nulls last`,
    [ids]
  );
  const standings = await sql(
    `select s.quiniela_id, s.user_id, s.name, s.avatar, s.points, s.predictions_made
       from quiniela_standings s
      where s.quiniela_id = any($1::uuid[])
      order by s.points desc, s.name`,
    [ids]
  );
  return qs.map(q =>
    shapeQuiniela(
      q,
      games.filter(g => g.quiniela_id === q.id),
      standings.filter(s => s.quiniela_id === q.id),
      userId
    )
  );
}

export async function isMember(quinielaId, userId) {
  const r = await sql(
    "select role from quiniela_members where quiniela_id = $1 and user_id = $2",
    [quinielaId, userId]
  );
  return r[0] ? r[0].role : null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
