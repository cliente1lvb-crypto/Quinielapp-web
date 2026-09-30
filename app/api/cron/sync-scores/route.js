import { ok, fail } from "../../../../lib/me";
import { syncScores } from "../../../../lib/football";

export const dynamic = "force-dynamic";

// GET /api/cron/sync-scores — lo llama Vercel Cron (ver vercel.json) cada 2 min.
// Si defines CRON_SECRET en Vercel, solo acepta llamadas con ese secreto
// (Vercel lo manda solo en el header Authorization).
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return fail("No autorizado.", 401);
  if (!process.env.DATABASE_URL) return fail("Sin base de datos.", 503);
  const r = await syncScores();
  return ok({ result: r });
}
