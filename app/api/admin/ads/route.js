import { sql } from "../../../../lib/db";
import { ok, fail, readJson } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
const PLACEMENTS = ["home_banner", "ranking_banner", "desktop_sidebar"];

// POST — alta de anuncio desde el panel.
export async function POST(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = await readJson(req);
  if (!b.advertiser || !PLACEMENTS.includes(b.placement) || !/^https?:\/\//.test(b.image_url || "") || !/^https?:\/\//.test(b.target_url || "")) {
    return fail("Llena anunciante, espacio, URL de imagen y URL de destino (con https://).");
  }
  try {
    const r = await sql(
      `insert into ads (advertiser, placement, image_url, target_url, ends_at)
       values ($1, $2, $3, $4, $5) returning *`,
      [String(b.advertiser).slice(0, 80), b.placement, b.image_url, b.target_url,
       b.ends_at && !isNaN(Date.parse(b.ends_at)) ? new Date(b.ends_at).toISOString() : null]
    );
    return ok({ ad: r[0] });
  } catch (e) { return fail(String(e.message || e), 500); }
}

// PATCH — { id, active }
export async function PATCH(req) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = await readJson(req);
  if (!b.id) return fail("Falta id.");
  try {
    await sql("update ads set active = $2 where id = $1", [b.id, !!b.active]);
    return ok();
  } catch (e) { return fail(String(e.message || e), 500); }
}
