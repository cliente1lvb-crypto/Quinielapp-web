import { ok, fail } from "../../../../lib/me";
import { syncScores } from "../../../../lib/football";
import { syncCalendarScores } from "../../../../lib/calendar";

export const dynamic = "force-dynamic";

// GET /api/cron/sync-scores — lo llama Vercel Cron (ver vercel.json) cada 2 min.
// Si defines CRON_SECRET en Vercel, solo acepta llamadas con ese secreto
// (Vercel lo manda solo en el header Authorization).
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return fail("No autorizado.", 401);
  if (!process.env.DATABASE_URL) return fail("Sin base de datos.", 503);
  const r = await syncScores();
  // Marcadores de partidos tomados del calendario abierto (5 grandes ligas).
  // Se revisa solo en el minuto 0-1 de cada hora para no hacerlo cada 2 min.
  let calendar = { skipped: true };
  if (new Date().getUTCMinutes() < 2 || new URL(req.url).searchParams.get("force")) {
    try { calendar = await syncCalendarScores(); } catch (e) { calendar = { error: String(e.message || e) }; }
  }
  return ok({ result: r, calendar });
}
