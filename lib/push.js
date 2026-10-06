// Notificaciones push (Web Push con llaves VAPID) + avisos dentro de la app.
// Variables en Vercel: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y (opcional)
// VAPID_SUBJECT (un correo "mailto:..." de contacto).
import webpush from "web-push";
import { sql } from "./db";

const pub = () => String(process.env.VAPID_PUBLIC_KEY || "").trim();
const priv = () => String(process.env.VAPID_PRIVATE_KEY || "").trim();
export const pushReady = () => !!(pub() && priv());
export const publicKey = () => pub();

let configured = false;
function configure() {
  if (configured || !pushReady()) return pushReady();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@quinielapp.com", pub(), priv());
  configured = true;
  return true;
}

let schemaReady = false;
export async function ensurePushSchema() {
  if (schemaReady) return;
  await sql(`create table if not exists push_subscriptions (
    endpoint   text primary key,
    user_id    uuid not null references users(id) on delete cascade,
    p256dh     text not null,
    auth       text not null,
    created_at timestamptz not null default now())`);
  await sql("create index if not exists idx_push_user on push_subscriptions(user_id)");
  // Para no mandar dos veces el mismo aviso (recordatorios, resultados).
  await sql(`create table if not exists push_log (
    key text primary key, created_at timestamptz not null default now())`);
  schemaReady = true;
}

export async function saveSubscription(userId, sub) {
  await ensurePushSchema();
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw new Error("Suscripción inválida.");
  await sql(
    `insert into push_subscriptions (endpoint, user_id, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [String(sub.endpoint), userId, String(sub.keys.p256dh), String(sub.keys.auth)]
  );
}
export async function removeSubscription(userId, endpoint) {
  await ensurePushSchema();
  if (endpoint) await sql("delete from push_subscriptions where endpoint = $1 and user_id = $2", [endpoint, userId]);
  else await sql("delete from push_subscriptions where user_id = $1", [userId]);
}
export async function countSubscriptions(userId) {
  await ensurePushSchema();
  return (await sql("select count(*)::int as n from push_subscriptions where user_id = $1", [userId]))[0].n;
}

// Marca una clave como enviada; devuelve false si ya se había mandado.
export async function once(key) {
  await ensurePushSchema();
  const r = await sql("insert into push_log (key) values ($1) on conflict do nothing returning key", [key]);
  return r.length > 0;
}

// Manda push a los usuarios (y, si inApp, también lo guarda en la campanita).
// payload: { title, body, url, icon, tag }
export async function notifyUsers(userIds, payload, { inApp = true, icon = "🔔" } = {}) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return { sent: 0 };
  if (inApp) {
    for (const id of ids) {
      await sql("insert into notifications (user_id, icon, title) values ($1, $2, $3)",
        [id, icon, String(payload.inAppTitle || payload.title + (payload.body ? ` — ${payload.body}` : "")).slice(0, 200)]).catch(() => {});
    }
  }
  if (!configure()) return { sent: 0, skipped: "sin llaves VAPID" };
  await ensurePushSchema();
  const subs = await sql("select endpoint, p256dh, auth from push_subscriptions where user_id = any($1::uuid[])", [ids]);
  const body = JSON.stringify({
    title: payload.title, body: payload.body || "", url: payload.url || "/",
    tag: payload.tag || undefined, icon: "/icon-192.png", badge: "/badge-72.png",
  });
  let sent = 0;
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 });
      sent++;
    } catch (e) {
      // 404/410: el navegador ya no tiene esa suscripción -> se borra.
      if (e && (e.statusCode === 404 || e.statusCode === 410)) await sql("delete from push_subscriptions where endpoint = $1", [s.endpoint]).catch(() => {});
    }
  }));
  return { sent, devices: subs.length };
}

// Miembros de una quiniela (opcionalmente sin incluir a alguien).
export async function membersOf(quinielaId, exceptUserId = null) {
  const r = await sql("select user_id from quiniela_members where quiniela_id = $1", [quinielaId]);
  return r.map(x => x.user_id).filter(id => id !== exceptUserId);
}

// Avisos automáticos que corre el cron:
//  1) recordatorio ~1 h antes de cada partido a quien no ha pronosticado;
//  2) resultado final con los puntos que ganó cada quien.
export async function runPushJobs() {
  await ensurePushSchema();
  const out = { reminders: 0, results: 0 };
  if (new Date().getUTCMinutes() < 2) await sql("delete from push_log where created_at < now() - interval '30 days'").catch(() => {});

  const soon = await sql(`
    select g.id as game_id, g.home_team, g.away_team, g.quiniela_id, q.name as qname, m.user_id
      from quiniela_games g
      join quinielas q on q.id = g.quiniela_id
      join quiniela_members m on m.quiniela_id = g.quiniela_id
      left join predictions p on p.quiniela_game_id = g.id and p.user_id = m.user_id
     where g.status = 'scheduled' and p.user_id is null
       and g.kickoff_at between now() + interval '40 minutes' and now() + interval '70 minutes'`);
  for (const r of soon) {
    if (!(await once(`remind:${r.game_id}:${r.user_id}`))) continue;
    await notifyUsers([r.user_id], {
      title: `⏰ ${r.home_team} vs ${r.away_team} empieza en 1 hora`,
      body: `Aún no mandas tu pronóstico en "${r.qname}". Se cierra 3 min antes del partido.`,
      url: `/?quiniela=${r.quiniela_id}`, tag: `remind-${r.game_id}`,
    }, { icon: "⏰" });
    out.reminders++;
  }

  const done = await sql(`
    select g.id as game_id, g.home_team, g.away_team, g.home_score, g.away_score, g.quiniela_id, q.name as qname,
           m.user_id, p.home_pred, p.away_pred
      from quiniela_games g
      join quinielas q on q.id = g.quiniela_id
      join quiniela_members m on m.quiniela_id = g.quiniela_id
      left join predictions p on p.quiniela_game_id = g.id and p.user_id = m.user_id
     where g.status = 'finished' and g.home_score is not null and g.away_score is not null
       and g.kickoff_at > now() - interval '3 days'`);
  for (const r of done) {
    if (!(await once(`final:${r.game_id}:${r.user_id}`))) continue;
    let pts = 0;
    if (r.home_pred !== null && r.home_pred !== undefined) {
      if (r.home_pred === r.home_score && r.away_pred === r.away_score) pts = 5;
      else if (Math.sign(r.home_pred - r.away_pred) === Math.sign(r.home_score - r.away_score)) pts = 3;
    }
    await notifyUsers([r.user_id], {
      title: `Final: ${r.home_team} ${r.home_score}-${r.away_score} ${r.away_team}`,
      body: r.home_pred === null || r.home_pred === undefined ? `No pronosticaste este partido en "${r.qname}".`
        : `Pusiste ${r.home_pred}-${r.away_pred}: ${pts === 5 ? "¡marcador exacto! +5 pts" : pts === 3 ? "acertaste el resultado, +3 pts" : "esta vez no, 0 pts"}.`,
      url: `/?quiniela=${r.quiniela_id}`, tag: `final-${r.game_id}`,
    }, { icon: pts === 5 ? "🎯" : pts === 3 ? "✅" : "⚽" });
    out.results++;
  }
  return out;
}
