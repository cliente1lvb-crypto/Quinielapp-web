import { requireMe, ok, fail, readJson } from "../../../lib/me";
import { pushReady, publicKey, saveSubscription, removeSubscription, countSubscriptions } from "../../../lib/push";

export const dynamic = "force-dynamic";

// GET /api/push — llave pública y si este usuario tiene dispositivos suscritos.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  if (!pushReady()) return ok({ enabled: false, publicKey: null, devices: 0 });
  try { return ok({ enabled: true, publicKey: publicKey(), devices: await countSubscriptions(me.id) }); }
  catch (e) { return fail(String(e.message || e), 500); }
}

// POST /api/push — { subscription } guarda este navegador para recibir avisos.
export async function POST(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  if (!pushReady()) return fail("Las notificaciones aún no están configuradas en el servidor.", 503);
  try {
    const body = await readJson(req);
    await saveSubscription(me.id, body.subscription);
    return ok({ devices: await countSubscriptions(me.id) });
  } catch (e) { return fail(String(e.message || e), 400); }
}

// DELETE /api/push — { endpoint? } deja de mandar avisos a este navegador (o a todos).
export async function DELETE(req) {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    const body = await readJson(req);
    await removeSubscription(me.id, body.endpoint || null);
    return ok({ devices: await countSubscriptions(me.id) });
  } catch (e) { return fail(String(e.message || e), 500); }
}
