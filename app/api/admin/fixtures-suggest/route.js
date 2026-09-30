import { ok, fail } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";
import { LEAGUES, BIG5, hasKey, nextFixtures } from "../../../../lib/football";

export const dynamic = "force-dynamic";

// GET /api/admin/fixtures-suggest — arma el sorteo de la Quiniela Global con la
// regla del proyecto: 2 partidos de cada una de las 5 grandes ligas. Si alguna
// no tiene partidos (descanso), rellena con Champions, Liga MX y MLS.
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  if (!hasKey()) return fail("Falta API_FOOTBALL_KEY en Vercel.", 503);
  const byId = Object.fromEntries(LEAGUES.map(l => [l.id, l]));
  const picked = [];
  const used = new Set();
  const take = async (id, n) => {
    try {
      const fx = (await nextFixtures(byId[id])).filter(f => f.status === "scheduled" && !used.has(f.id)).slice(0, n);
      fx.forEach(f => { used.add(f.id); picked.push({ home: f.home, away: f.away, league: byId[id].name, apiId: f.apiId, kickoffAt: f.kickoffAt, date: f.date }); });
      return fx.length;
    } catch { return 0; }
  };
  let missing = 0;
  for (const id of BIG5) missing += 2 - (await take(id, 2));
  for (const id of ["ucl", "ligamx", "mls"]) { if (missing <= 0) break; missing -= await take(id, missing); }
  picked.sort((x, y) => new Date(x.kickoffAt) - new Date(y.kickoffAt));
  return ok({ matches: picked.slice(0, 10) });
}
