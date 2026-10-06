// Calendario de las 5 grandes ligas de Europa desde openfootball
// (github.com/openfootball/football.json): datos abiertos, gratis y sin clave.
// Trae la temporada completa (todas las jornadas con fecha y hora) y los
// marcadores finales conforme los voluntarios del proyecto los capturan
// (suelen ir con algunos días de retraso; no hay marcador en vivo).
import { sql } from "./db";
import { ensureSchema } from "./football";

const RAW = "https://raw.githubusercontent.com/openfootball/football.json/master";

// tz = zona horaria en la que openfootball publica la hora del partido.
export const CAL_LEAGUES = [
  { id: "epl", file: "en.1", name: "Premier League", short: "PL", country: "Inglaterra", tz: "Europe/London" },
  { id: "laliga", file: "es.1", name: "La Liga", short: "LL", country: "España", tz: "Europe/Madrid" },
  { id: "seriea", file: "it.1", name: "Serie A", short: "SA", country: "Italia", tz: "Europe/Rome" },
  { id: "bundesliga", file: "de.1", name: "Bundesliga", short: "BL", country: "Alemania", tz: "Europe/Berlin" },
  { id: "ligue1", file: "fr.1", name: "Ligue 1", short: "L1", country: "Francia", tz: "Europe/Paris" },
];

// Temporada europea (agosto–mayo): "2026-27".
export function seasonOf(d) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  const start = m >= 7 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

// "2026-10-18" + "15:00" en Europe/London -> Date en UTC.
function zonedToUtc(date, time, tz) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = String(time || "12:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h || 0, mi || 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(guess)).reduce((o, p) => ((o[p.type] = p.value), o), {});
  const asTz = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  return new Date(guess - (asTz - guess));
}

function slug(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Quita sufijos tipo "FC", "CF", "AFC" para que los nombres se vean limpios.
export function cleanTeam(n) {
  return String(n || "")
    .replace(/\s+(FC|CF|AFC|SC|AC|SSC|BC|FCO)$/i, "")
    .trim();
}

function mapMatch(m, lg) {
  const ko = zonedToUtc(m.date, m.time, lg.tz);
  const ft = m.score && !Array.isArray(m.score) ? m.score.ft : Array.isArray(m.score) ? m.score : null;
  const hasScore = Array.isArray(ft) && ft.length === 2;
  const started = ko.getTime() <= Date.now();
  return {
    id: `of:${lg.id}:${m.date}:${slug(m.team1)}:${slug(m.team2)}`,
    league: lg.name, leagueId: lg.id, leagueShort: lg.short,
    round: String(m.round || "").replace(/^Matchday\s*/i, "Jornada "),
    home: cleanTeam(m.team1), away: cleanTeam(m.team2),
    homeRaw: m.team1, awayRaw: m.team2,
    kickoffAt: ko.toISOString(),
    hs: hasScore ? ft[0] : null, as: hasScore ? ft[1] : null,
    status: hasScore ? "final" : started ? "pending" : "scheduled", // pending = ya se jugó, falta el marcador
  };
}

// Descarga una liga/temporada. Next guarda la respuesta 3 h en su caché de datos.
async function loadLeagueSeason(lg, season) {
  const res = await fetch(`${RAW}/${season}/${lg.file}.json`, { next: { revalidate: 3 * 3600 } });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return data && Array.isArray(data.matches) ? data.matches.map(m => mapMatch(m, lg)) : [];
}

// Todos los partidos entre dos fechas (Date), de las ligas pedidas.
export async function matchesBetween(from, to, leagueIds = null) {
  const leagues = CAL_LEAGUES.filter(l => !leagueIds || leagueIds.includes(l.id));
  const seasons = [...new Set([seasonOf(from), seasonOf(to)])];
  const lists = await Promise.all(leagues.flatMap(lg => seasons.map(s => loadLeagueSeason(lg, s).catch(() => []))));
  const a = from.getTime(), b = to.getTime();
  const seen = new Set();
  return lists.flat()
    .filter(m => { const t = Date.parse(m.kickoffAt); return t >= a && t < b; })
    .filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    .sort((x, y) => Date.parse(x.kickoffAt) - Date.parse(y.kickoffAt));
}

// Próximos partidos (para crear quinielas y el tablero).
export async function upcoming(leagueIds = null, days = 21) {
  const now = new Date(Date.now() - 2 * 3600e3);
  return (await matchesBetween(now, new Date(Date.now() + days * 864e5), leagueIds)).filter(m => m.status === "scheduled");
}

// Pone marcadores finales a los partidos de quinielas que salieron de este
// calendario (no tienen api_fixture_id). Lo llama el cron.
export async function syncCalendarScores() {
  await ensureSchema();
  const rows = await sql(`
    select id, home_team, away_team, kickoff_at from quiniela_games
     where api_fixture_id is null and status <> 'finished' and kickoff_at is not null
       and kickoff_at < now() - interval '2 hours' and kickoff_at > now() - interval '60 days'`);
  const draws = await sql(`
    select draw_id, n, home_team, away_team, kickoff_at from global_draw_matches
     where api_fixture_id is null and result is null and kickoff_at is not null
       and kickoff_at < now() - interval '2 hours' and kickoff_at > now() - interval '60 days'`).catch(() => []);
  if (!rows.length && !draws.length) return { checked: 0, updated: 0 };
  const min = new Date(Math.min(...[...rows, ...draws].map(r => new Date(r.kickoff_at).getTime())) - 864e5);
  const all = await matchesBetween(min, new Date());
  const byKey = new Map(all.filter(m => m.status === "final").map(m => [`${slug(m.home)}|${slug(m.away)}|${m.kickoffAt.slice(0, 10)}`, m]));
  let updated = 0;
  for (const r of rows) {
    const m = byKey.get(`${slug(r.home_team)}|${slug(r.away_team)}|${new Date(r.kickoff_at).toISOString().slice(0, 10)}`);
    if (!m) continue;
    const u = await sql(
      "update quiniela_games set home_score = $2, away_score = $3, status = 'finished' where id = $1 and status <> 'finished' returning id",
      [r.id, m.hs, m.as]);
    updated += u.length;
  }
  // Quiniela Global: resultado L / E / V.
  for (const r of draws) {
    const m = byKey.get(`${slug(r.home_team)}|${slug(r.away_team)}|${new Date(r.kickoff_at).toISOString().slice(0, 10)}`);
    if (!m) continue;
    const res = m.hs > m.as ? "L" : m.hs < m.as ? "V" : "E";
    const u = await sql("update global_draw_matches set result = $3 where draw_id = $1 and n = $2 and result is null returning n", [r.draw_id, r.n, res]);
    updated += u.length;
  }
  return { checked: rows.length + draws.length, updated };
}
