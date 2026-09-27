import { sql } from "../../../lib/db";
import { requireMe, ok, fail, readJson } from "../../../lib/me";
import { UUID_RE } from "../../../lib/quinielas";

export const dynamic = "force-dynamic";

// POST /api/reports — { reportedId?, quinielaId?, kind: "report"|"block", reason? }
export async function POST(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  const b = await readJson(req);
  const kind = b.kind === "block" ? "block" : "report";
  const reported = UUID_RE.test(String(b.reportedId || "")) ? b.reportedId : null;
  const quiniela = UUID_RE.test(String(b.quinielaId || "")) ? b.quinielaId : null;
  try {
    await sql(
      "insert into user_reports (reporter_id, reported_id, quiniela_id, kind, reason) values ($1, $2, $3, $4, $5)",
      [me.id, reported, quiniela, kind, String(b.reason || "").slice(0, 200) || null]
    );
    return ok();
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
