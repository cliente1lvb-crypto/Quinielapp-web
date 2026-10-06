import { requireMe, ok, fail } from "../../../lib/me";
import { CAL_LEAGUES, upcoming } from "../../../lib/calendar";

export const dynamic = "force-dynamic";

// GET /api/fixtures            → ligas disponibles para armar quinielas
// GET /api/fixtures?league=id  → próximos partidos reales de esa liga
// Por ahora solo las 5 grandes ligas de Europa, con el calendario abierto de
// openfootball (gratis). Cuando se contrate el plan de API-Football se pueden
// volver a sumar Liga MX, Champions, MLS, etc. (ver lib/football.js).
export async function GET(req) {
  const { error } = await requireMe();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("league");
  if (!id) {
    return ok({ leagues: CAL_LEAGUES.map(l => ({ id: l.id, name: l.name, country: l.short, premium: false, fixtures: null })) });
  }
  const league = CAL_LEAGUES.find(l => l.id === id);
  if (!league) return fail("Liga no válida.", 404);
  try {
    const list = (await upcoming([id], 21)).slice(0, 20).map(m => ({
      ...m, date: dateLabel(m.kickoffAt),
    }));
    return ok({ league: id, fixtures: list });
  } catch (e) {
    return fail("No pudimos cargar los partidos. Intenta en un momento.", 502);
  }
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function dateLabel(iso) {
  // Etiqueta en hora del centro de México (la que se guarda como texto en la quiniela).
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
}
