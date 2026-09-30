// Integración con API-Football (api-sports.io). Solo se usa del lado del
// servidor: la clave vive en la variable de entorno API_FOOTBALL_KEY y nunca
// llega al navegador.
import { sql } from "./db";

const BASE = process.env.API_FOOTBALL_BASE || "https://v3.football.api-sports.io";
export const TZ = "America/Mexico_City";

// Ligas que ofrece la app. apiId = id de la liga en API-Football.
export const LEAGUES = [
  { id: "ligamx", name: "Liga MX", country: "🇲🇽", apiId: 262, premium: false },
  { id: "epl", name: "Premier League", country: "🏴", apiId: 39, premium: false },
  { id: "laliga", name: "La Liga", country: "🇪🇸", apiId: 140, premium: false },
  { id: "seriea", name: "Serie A", country: "🇮🇹", apiId: 135, premium: false },
  { id: "bundesliga", name: "Bundesliga", country: "🇩🇪", apiId: 78, premium: false },
  { id: "ucl", name: "Champions League", country: "⭐", apiId: 2, premium: false },
  { id: "ligue1", name: "Ligue 1", country: "🇫🇷", apiId: 61, premium: true },
  { id: "mls", name: "MLS", country: "🇺🇸", apiId: 253, premium: true },
  { id: "uel", name: "Europa League", country: "🟠", apiId: 3, premium: true },
  { id: "eredivisie", name: "Eredivisie", country: "🇳🇱", apiId: 88, premium: true },
  { id: "portugal", name: "Primeira Liga", country: "🇵🇹", apiId: 94, premium: true },
];
export const BIG5 = ["epl", "laliga", "seriea", "bundesliga", "ligue1"];

// Limpia espacios, saltos de línea o comillas que se cuelan al pegar la clave.
const apiKey = () => String(process.env.API_FOOTBALL_KEY || "").trim().replace(/^["']|["']$/g, "");
export const hasKey = () => !!apiKey();

// Última lectura de cuota que devolvió la API (por instancia del servidor).
export const quota = { remaining: null, limit: null, at: null };

export async function afGet(path, params = {}, revalidate = 0) {
  if (!hasKey()) throw new Error("Falta API_FOOTBALL_KEY en Vercel.");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/${path}${qs ? `?${qs}` : ""}`, {
    headers: { "x-apisports-key": apiKey() },
    ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" }),
  });
  const rem = res.headers.get("x-ratelimit-requests-remaining");
  const lim = res.headers.get("x-ratelimit-requests-limit");
  if (rem !== null) Object.assign(quota, { remaining: Number(rem), limit: Number(lim), at: new Date().toISOString() });
  const data = await res.json().catch(() => ({}));
  const errs = data.errors;
  const hasErr = errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length);
  if (!res.ok || hasErr) {
    const msg = hasErr ? (Array.isArray(errs) ? errs.join(", ") : Object.values(errs).join(", ")) : `HTTP ${res.status}`;
    throw new Error(`API-Football: ${msg}`);
  }
  return data;
}

const LIVE = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "SUSP"];
const DONE = ["FT", "AET", "PEN", "AWD", "WO"];
export function mapStatus(short) {
  if (DONE.includes(short)) return "finished";
  if (LIVE.includes(short)) return "live";
  return "scheduled"; // NS, TBD, PST, CANC, ABD...
}

export function dateLabel(iso) {
  const s = new Date(iso).toLocaleString("es-MX", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/\./g, "");
}

export function mapFixture(f) {
  const status = mapStatus(f.fixture.status.short);
  const minute = status === "live"
    ? (f.fixture.status.short === "HT" ? "MT" : `${f.fixture.status.elapsed ?? ""}'`)
    : null;
  return {
    id: String(f.fixture.id),
    apiId: f.fixture.id,
    home: f.teams.home.name,
    away: f.teams.away.name,
    kickoffAt: f.fixture.date,
    date: dateLabel(f.fixture.date),
    status: status === "finished" ? "final" : status,
    rawStatus: f.fixture.status.short,
    minute,
    hs: f.goals.home,
    as: f.goals.away,
    postponed: ["PST", "CANC", "ABD"].includes(f.fixture.status.short),
  };
}

// Próximos partidos de una liga (se cachean 30 min para cuidar la cuota).
// Temporada vigente según API-Football: las ligas de calendario anual (MLS)
// usan el año; las demás (Europa, Liga MX) cambian de temporada a mitad de año.
function seasonFor(league, d = new Date()) {
  const y = d.getUTCFullYear();
  if (league.id === "mls") return y;
  return d.getUTCMonth() >= 6 ? y : y - 1;
}
const ymd = (d) => d.toISOString().slice(0, 10);

export async function nextFixtures(league, n = 15) {
  let list;
  try {
    const data = await afGet("fixtures", { league: league.apiId, next: n, timezone: TZ }, 1800);
    list = data.response || [];
  } catch (e) {
    // Algunos planes no permiten el parámetro "next": pedimos por rango de fechas.
    const from = new Date(); const to = new Date(Date.now() + 21 * 864e5);
    const data = await afGet("fixtures", {
      league: league.apiId, season: seasonFor(league), from: ymd(from), to: ymd(to), timezone: TZ,
    }, 1800);
    list = (data.response || []).filter(f => new Date(f.fixture.date) > new Date(Date.now() - 3 * 3600e3));
  }
  return list
    .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))
    .slice(0, n)
    .map(mapFixture)
    .filter(f => !f.postponed);
}

// ---------- esquema: columnas extra para enlazar con API-Football ----------
let schemaReady = false;
export async function ensureSchema() {
  if (schemaReady) return;
  await sql("alter table quiniela_games add column if not exists api_fixture_id bigint");
  await sql("create index if not exists idx_qgames_api on quiniela_games(api_fixture_id)");
  await sql("alter table global_draw_matches add column if not exists api_fixture_id bigint");
  await sql("alter table global_draw_matches add column if not exists kickoff_at timestamptz");
  await sql(`create table if not exists api_sync_state (
    key text primary key, at timestamptz not null default now(), info jsonb)`);
  schemaReady = true;
}

// ---------- sincronización de marcadores ----------
// Busca los partidos enlazados a API-Football que ya arrancaron (o están por
// arrancar) y no han terminado, pide su marcador en bloques de 20 y actualiza
// quinielas y Quiniela Global. Con candado de 50 s para no gastar cuota de más.
export async function syncScores({ force = false } = {}) {
  if (!hasKey()) return { ok: false, skipped: "sin API_FOOTBALL_KEY" };
  await ensureSchema();

  const lock = await sql(
    `insert into api_sync_state (key, at, info) values ('scores', now(), '{"running":true}')
     on conflict (key) do update set at = now(), info = api_sync_state.info || '{"running":true}'
     where $1 or api_sync_state.at < now() - interval '50 seconds'
     returning key`,
    [force]
  );
  if (!lock.length) return { ok: true, skipped: "sincronizado hace menos de 50 s" };

  const info = { at: new Date().toISOString(), checked: 0, updated: 0, requests: 0, error: null };
  try {
    const rows = await sql(`
      select distinct api_fixture_id as id from quiniela_games
       where api_fixture_id is not null and status <> 'finished'
         and (kickoff_at is null or kickoff_at <= now() + interval '10 minutes')
         and (kickoff_at is null or kickoff_at >= now() - interval '2 days')
      union
      select distinct api_fixture_id from global_draw_matches
       where api_fixture_id is not null and result is null
         and (kickoff_at is null or kickoff_at <= now() + interval '10 minutes')
         and (kickoff_at is null or kickoff_at >= now() - interval '2 days')`);
    const ids = rows.map(r => r.id);
    info.checked = ids.length;
    for (let i = 0; i < ids.length; i += 20) {
      const chunk = ids.slice(i, i + 20);
      const data = await afGet("fixtures", { ids: chunk.join("-"), timezone: TZ });
      info.requests++;
      for (const f of data.response || []) {
        const m = mapFixture(f);
        const st = m.status === "final" ? "finished" : m.status;
        if (m.postponed) continue;
        const u = await sql(
          `update quiniela_games set
             home_score = $2, away_score = $3, status = $4, match_minute = $5, kickoff_at = $6
           where api_fixture_id = $1
             and (status is distinct from $4 or home_score is distinct from $2 or away_score is distinct from $3 or match_minute is distinct from $5)
           returning id`,
          [m.apiId, st === "scheduled" ? null : m.hs, st === "scheduled" ? null : m.as, st, m.minute, m.kickoffAt]
        );
        info.updated += u.length;
        if (st === "finished" && m.hs !== null && m.as !== null) {
          const res = m.hs > m.as ? "L" : m.hs < m.as ? "V" : "E";
          await sql("update global_draw_matches set result = $2 where api_fixture_id = $1 and result is null", [m.apiId, res]);
        }
      }
    }
  } catch (e) {
    info.error = String(e.message || e);
  }
  await sql("update api_sync_state set info = $1::jsonb where key = 'scores'", [JSON.stringify(info)]);
  return { ok: !info.error, ...info };
}

export async function lastSync() {
  try {
    const r = await sql("select at, info from api_sync_state where key = 'scores'");
    return r[0] ? { at: r[0].at, ...(r[0].info || {}) } : null;
  } catch { return null; }
}
