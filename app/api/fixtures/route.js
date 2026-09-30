import { requireMe, ok, fail } from "../../../lib/me";
import { LEAGUES, hasKey, nextFixtures } from "../../../lib/football";

export const dynamic = "force-dynamic";

// GET /api/fixtures            → lista de ligas disponibles (no gasta cuota)
// GET /api/fixtures?league=id  → próximos partidos reales de esa liga
// Se pide liga por liga (solo las que el usuario elige) para no rebasar el
// límite de consultas por minuto de API-Football; cada liga se guarda 6 h en Neon.
export async function GET(req) {
  const { error } = await requireMe();
  if (error) return error;
  if (!hasKey()) return fail("Falta API_FOOTBALL_KEY.", 503, { demo: true });
  const id = new URL(req.url).searchParams.get("league");
  if (!id) {
    return ok({ leagues: LEAGUES.map(l => ({ id: l.id, name: l.name, country: l.country, premium: l.premium, fixtures: null })) });
  }
  const league = LEAGUES.find(l => l.id === id);
  if (!league) return fail("Liga no válida.", 404);
  try {
    return ok({ league: id, fixtures: await nextFixtures(league) });
  } catch (e) {
    const msg = String(e.message || e);
    return fail(/too many|per minute/i.test(msg) ? "La API está saturada en este momento; intenta en un minuto." : msg, 502);
  }
}
