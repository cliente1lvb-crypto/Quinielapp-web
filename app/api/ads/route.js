import { sql } from "../../../lib/db";

// GET /api/ads?placement=home_banner
// Devuelve el anuncio activo más reciente para ese espacio, o { ad: null } si
// no hay ninguno configurado todavía — el componente <AdBanner> del cliente
// usa ese null para mostrar el placeholder de "espacio publicitario".
export async function GET(req) {
  const placement = new URL(req.url).searchParams.get("placement");
  if (!placement) {
    return Response.json({ ok: false, error: "Falta ?placement=" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `select id, advertiser, image_url, target_url
       from ads
       where placement = $1
         and active = true
         and starts_at <= now()
         and (ends_at is null or ends_at > now())
       order by created_at desc
       limit 1`,
      [placement]
    );
    return Response.json({ ok: true, ad: rows[0] || null });
  } catch (err) {
    // Sin DATABASE_URL (o cualquier otro problema de conexión): responde
    // "sin anuncio" en vez de tronar, para que el placeholder se vea normal.
    return Response.json({ ok: true, ad: null });
  }
}

// POST /api/ads — da de alta un anuncio nuevo.
// TODO: proteger este endpoint (hoy cualquiera con la URL podría llamarlo).
// La forma más simple: exigir un header "x-admin-key" que compares contra una
// variable de entorno ADMIN_KEY antes de tener un panel de administración real.
export async function POST(req) {
  const { advertiser, placement, image_url, target_url, ends_at } = await req.json();

  if (!advertiser || !placement || !image_url || !target_url) {
    return Response.json(
      { ok: false, error: "Faltan campos: advertiser, placement, image_url, target_url." },
      { status: 400 }
    );
  }

  const rows = await sql(
    `insert into ads (advertiser, placement, image_url, target_url, ends_at)
     values ($1, $2, $3, $4, $5)
     returning *`,
    [advertiser, placement, image_url, target_url, ends_at || null]
  );
  return Response.json({ ok: true, ad: rows[0] });
}
