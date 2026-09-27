import { sql } from "../../../lib/db";
import { requireMe, ok, fail } from "../../../lib/me";

export const dynamic = "force-dynamic";

function ago(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "Hace un momento";
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "Ayer";
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// GET /api/notifications — las últimas 30.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    const rows = await sql(
      "select id, icon, title, read_at, created_at from notifications where user_id = $1 order by created_at desc limit 30",
      [me.id]
    );
    return ok({
      notifications: rows.map(n => ({ id: n.id, icon: n.icon, title: n.title, time: ago(n.created_at), unread: !n.read_at })),
    });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}

// POST /api/notifications — marca todas como leídas.
export async function POST() {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    await sql("update notifications set read_at = now() where user_id = $1 and read_at is null", [me.id]);
    return ok();
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
