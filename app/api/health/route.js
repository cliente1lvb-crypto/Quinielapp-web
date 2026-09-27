import { sql } from "../../../lib/db";

// GET /api/health — primera prueba después de desplegar en Vercel:
// confirma que la variable DATABASE_URL está bien configurada y que
// Neon responde. Si esto falla, revisa el paso "Variables de entorno" del README.
export async function GET() {
  try {
    const rows = await sql("select now() as server_time");
    return Response.json({ ok: true, server_time: rows[0].server_time });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
