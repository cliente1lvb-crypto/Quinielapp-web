import { sql } from "../../../../lib/db";
import { ok, fail, readJson } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
const STATUSES = ["draft", "open", "running", "finished"];

// GET — todos los torneos con número de participantes y líder.
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  try {
    const rows = await sql(`
      select t.*,
        (select count(*)::int from tournament_entries e where e.tournament_id = t.id) as players,
        (select s.name from tournament_standings s where s.tournament_id = t.id order by s.hits desc limit 1) as leader
      from tournaments t order by t.created_at desc`);
    return ok({ tournaments: rows });
  } catch (e) { return fail(String(e.message || e), 500); }
}

function clean(b) {
  const out = {};
  if (b.name !== undefined) out.name = String(b.name).trim().slice(0, 80);
  if (b.emoji !== undefined) out.emoji = String(b.emoji || "🏆").slice(0, 8);
  if (b.region !== undefined) out.region = String(b.region || "Nacional").trim().slice(0, 60) || "Nacional";
  if (b.description !== undefined) out.description = String(b.description || "").slice(0, 400) || null;
  if (b.prize !== undefined) out.prize = String(b.prize || "").slice(0, 160) || null;
  if (b.starts_at !== undefined) out.starts_at = b.starts_at && !isNaN(Date.parse(b.starts_at)) ? new Date(b.starts_at).toISOString() : new Date().toISOString();
  if (b.ends_at !== undefined) out.ends_at = b.ends_at && !isNaN(Date.parse(b.ends_at)) ? new Date(b.ends_at).toISOString() : null;
  if (b.max_players !== undefined) out.max_players = parseInt(b.max_players, 10) > 0 ? parseInt(b.max_players, 10) : null;
  if (b.status !== undefined) out.status = STATUSES.includes(b.status) ? b.status : "open";
  return out;
}

// POST — crear torneo.
export async function POST(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const c = clean(await readJson(req));
  if (!c.name) return fail("El torneo necesita nombre.");
  try {
    const r = await sql(
      `insert into tournaments (name, emoji, region, description, prize, starts_at, ends_at, max_players, status, created_by)
       values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()), $7, $8, $9, $10) returning *`,
      [c.name, c.emoji || "🏆", c.region || "Nacional", c.description ?? null, c.prize ?? null,
       c.starts_at || null, c.ends_at ?? null, c.max_players ?? null, c.status || "open", a.adminId]
    );
    return ok({ tournament: r[0] });
  } catch (e) { return fail(String(e.message || e), 500); }
}

// PATCH — { id, ...campos } editar / cambiar estado.
export async function PATCH(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = await readJson(req);
  const c = clean(b);
  const keys = Object.keys(c);
  if (!b.id || !keys.length) return fail("Nada que actualizar.");
  try {
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const r = await sql(`update tournaments set ${sets} where id = $1 returning *`, [b.id, ...keys.map(k => c[k])]);
    if (!r[0]) return fail("Torneo no encontrado.", 404);
    return ok({ tournament: r[0] });
  } catch (e) { return fail(String(e.message || e), 500); }
}

// DELETE ?id= — borra el torneo (y sus inscripciones).
export async function DELETE(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("Falta id.");
  try {
    await sql("delete from tournaments where id = $1", [id]);
    return ok();
  } catch (e) { return fail(String(e.message || e), 500); }
}
