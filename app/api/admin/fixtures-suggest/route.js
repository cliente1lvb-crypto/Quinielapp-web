import { ok, fail } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";
import { CAL_LEAGUES, upcoming } from "../../../../lib/calendar";

export const dynamic = "force-dynamic";

// GET /api/admin/fixtures-suggest — arma el sorteo de la Quiniela Global con la
// regla del proyecto: 2 partidos de cada una de las 5 grandes ligas, tomados del
// calendario abierto (lib/calendar.js). Si una liga está en descanso, rellena
// con más partidos de las otras.
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const all = await upcoming(null, 14);
    const picked = [], used = new Set();
    for (const lg of CAL_LEAGUES) {
      all.filter(m => m.leagueId === lg.id).slice(0, 2).forEach(m => { used.add(m.id); picked.push(m); });
    }
    for (const m of all) { if (picked.length >= 10) break; if (!used.has(m.id)) { used.add(m.id); picked.push(m); } }
    picked.sort((x, y) => new Date(x.kickoffAt) - new Date(y.kickoffAt));
    return ok({ matches: picked.slice(0, 10).map(m => ({ home: m.home, away: m.away, league: m.league, apiId: null, kickoffAt: m.kickoffAt })) });
  } catch (e) {
    return fail("No pudimos cargar el calendario.", 502);
  }
}
