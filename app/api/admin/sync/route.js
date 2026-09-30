import { ok } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";
import { syncScores } from "../../../../lib/football";

export const dynamic = "force-dynamic";

// POST /api/admin/sync — botón "Sincronizar ya" del panel (ignora el candado de 50 s).
export async function POST() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  return ok({ result: await syncScores({ force: true }) });
}
