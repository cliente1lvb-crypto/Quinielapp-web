import { requireMe, ok, fail } from "../../../lib/me";
import { LEAGUES, hasKey, nextFixtures } from "../../../lib/football";

export const dynamic = "force-dynamic";

// GET /api/fixtures — próximos partidos reales de todas las ligas de la app.
// Cada liga se cachea 30 min en Vercel, así que abrir "Crear quiniela" muchas
// veces no gasta cuota de la API.
export async function GET() {
  const { error } = await requireMe();
  if (error) return error;
  if (!hasKey()) return fail("Falta API_FOOTBALL_KEY.", 503, { demo: true });
  const results = await Promise.all(LEAGUES.map(async (l) => {
    try {
      return { id: l.id, name: l.name, country: l.country, premium: l.premium, fixtures: await nextFixtures(l) };
    } catch (e) {
      return { id: l.id, name: l.name, country: l.country, premium: l.premium, fixtures: [], error: String(e.message || e) };
    }
  }));
  const allFailed = results.every(r => r.error);
  if (allFailed) return fail(results[0].error || "No se pudo leer API-Football.", 502);
  return ok({ leagues: results });
}
