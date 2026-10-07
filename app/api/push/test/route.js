import { requireMe, ok, fail } from "../../../../lib/me";
import { pushReady, notifyUsers } from "../../../../lib/push";

export const dynamic = "force-dynamic";

// POST /api/push/test — manda un aviso de prueba a mis dispositivos.
export async function POST() {
  const { me, error } = await requireMe();
  if (error) return error;
  if (!pushReady()) return fail("Las notificaciones aún no están configuradas en el servidor.", 503);
  try {
    const r = await notifyUsers([me.id], { title: "¡Listo! Las notificaciones funcionan ⚽", body: "Te avisaremos antes de cada partido y cuando haya resultados.", url: "/" }, { inApp: false });
    if (r.configError) return fail(`Configuración de notificaciones inválida en el servidor: ${r.configError}`, 500);
    if (!r.devices) return fail("No encontramos este dispositivo suscrito. Desactívalas y vuelve a activarlas.", 404);
    if (!r.sent) return fail(`No pudimos entregar la notificación (${r.lastError || "error desconocido"}). Desactívalas y vuelve a activarlas.`, 502);
    return ok(r);
  } catch (e) {
    return fail(`Error al enviar: ${String(e.message || e).slice(0, 200)}`, 500);
  }
}
