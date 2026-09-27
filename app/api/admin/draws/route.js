import { sql } from "../../../../lib/db";
import { ok, fail, readJson } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

// GET — sorteos de la Quiniela Global con partidos, resultados y boletos.
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const draws = await sql(`
      select d.*, (select count(*)::int from global_tickets t where t.draw_id = d.id) as tickets
      from global_draws d order by d.id desc limit 12`);
    const ids = draws.map(d => d.id);
    const matches = ids.length
      ? await sql("select * from global_draw_matches where draw_id = any($1::int[]) order by draw_id, n", [ids])
      : [];
    return ok({ draws: draws.map(d => ({ ...d, matches: matches.filter(m => m.draw_id === d.id) })) });
  } catch (e) { return fail(String(e.message || e), 500); }
}

// POST — nuevo sorteo: { id, close_label, closes_at, matches: [{home, away, league}] }
export async function POST(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = await readJson(req);
  const id = parseInt(b.id, 10);
  const matches = (Array.isArray(b.matches) ? b.matches : []).filter(m => m && m.home && m.away).slice(0, 14);
  if (!id) return fail("Pon el número de sorteo.");
  if (matches.length < 1) return fail("Agrega al menos un partido.");
  try {
    const exists = await sql("select 1 from global_draws where id = $1", [id]);
    if (exists.length) return fail(`El sorteo #${id} ya existe.`, 409);
    const closes = b.closes_at && !isNaN(Date.parse(b.closes_at)) ? new Date(b.closes_at).toISOString() : null;
    await sql("insert into global_draws (id, closes_at, close_label, status) values ($1, $2, $3, 'open')",
      [id, closes, String(b.close_label || "").slice(0, 60) || null]);
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      await sql("insert into global_draw_matches (draw_id, n, home_team, away_team, league) values ($1, $2, $3, $4, $5)",
        [id, i + 1, String(m.home).slice(0, 60), String(m.away).slice(0, 60), String(m.league || "").slice(0, 60) || null]);
    }
    if (b.closeOthers) await sql("update global_draws set status = 'closed' where id <> $1 and status = 'open'", [id]);
    return ok();
  } catch (e) { return fail(String(e.message || e), 500); }
}

// PATCH — { id, status?, results?: { "1": "L" | "E" | "V" | null } }
export async function PATCH(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = await readJson(req);
  const id = parseInt(b.id, 10);
  if (!id) return fail("Falta el sorteo.");
  try {
    if (b.status) {
      if (!["open", "closed", "finished"].includes(b.status)) return fail("Estado no válido.");
      await sql("update global_draws set status = $2 where id = $1", [id, b.status]);
    }
    if (b.results && typeof b.results === "object") {
      for (const [n, v] of Object.entries(b.results)) {
        const val = ["L", "E", "V"].includes(v) ? v : null;
        await sql("update global_draw_matches set result = $3 where draw_id = $1 and n = $2", [id, parseInt(n, 10), val]);
      }
    }
    return ok();
  } catch (e) { return fail(String(e.message || e), 500); }
}
