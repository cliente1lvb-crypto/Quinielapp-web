import { sql } from "../../../../lib/db";

// POST /api/ads/track — { ad_id, type: "impression" | "click" }
// El componente <AdBanner> llama esto una vez al mostrarse (impression) y una
// vez al hacer clic (click). Falla en silencio si no hay base de datos
// conectada todavía — nunca debe romper la vista del anuncio.
export async function POST(req) {
  try {
    const { ad_id, type } = await req.json();
    if (!ad_id || (type !== "impression" && type !== "click")) {
      return Response.json({ ok: false, error: "ad_id y type ('impression'|'click') son requeridos." }, { status: 400 });
    }
    const column = type === "impression" ? "impressions" : "clicks";
    await sql(`update ads set ${column} = ${column} + 1 where id = $1`, [ad_id]);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: true }); // no bloquear al usuario por esto
  }
}
