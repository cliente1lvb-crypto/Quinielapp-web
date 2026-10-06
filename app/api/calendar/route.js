import { ok, fail } from "../../../lib/me";
import { CAL_LEAGUES, matchesBetween, upcoming } from "../../../lib/calendar";

export const dynamic = "force-dynamic";

// GET /api/calendar?month=2026-10[&leagues=epl,laliga]  → partidos del mes
// GET /api/calendar?upcoming=12                          → próximos partidos
// Fuente: openfootball (datos abiertos). Las fechas van en UTC; el navegador
// las muestra en la hora local del usuario.
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const ids = q.get("leagues") ? q.get("leagues").split(",").filter(id => CAL_LEAGUES.some(l => l.id === id)) : null;
  const leagues = CAL_LEAGUES.map(({ id, name, short, country }) => ({ id, name, short, country }));
  try {
    if (q.get("upcoming")) {
      const n = Math.min(60, Math.max(1, parseInt(q.get("upcoming"), 10) || 12));
      const list = await upcoming(ids, 14);
      // Reparte entre ligas para que no salgan 12 partidos de la misma.
      const per = {}; const out = [];
      for (const m of list) { per[m.leagueId] = (per[m.leagueId] || 0) + 1; if (per[m.leagueId] <= Math.ceil(n / 5) + 1) out.push(m); if (out.length >= n) break; }
      return ok({ leagues, matches: out, source: "openfootball" });
    }
    const month = /^\d{4}-\d{2}$/.test(q.get("month") || "") ? q.get("month") : new Date().toISOString().slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    // Un día de margen a cada lado para cubrir cualquier zona horaria.
    const from = new Date(Date.UTC(y, m - 1, 1) - 864e5);
    const to = new Date(Date.UTC(y, m, 1) + 864e5);
    return ok({ month, leagues, matches: await matchesBetween(from, to, ids), source: "openfootball" });
  } catch (e) {
    return fail("No pudimos cargar el calendario. Intenta en un momento.", 502);
  }
}
