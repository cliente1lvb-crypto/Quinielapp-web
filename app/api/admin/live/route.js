import { sql } from "../../../../lib/db";
import { ok } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";
import { hasKey, accountStatus, lastSync } from "../../../../lib/football";

export const dynamic = "force-dynamic";

async function q(text, params = [], fallback = []) {
  try { return await sql(text, params); } catch { return fallback; }
}

// GET /api/admin/live — estado del sistema, contadores y actividad reciente.
// El panel lo consulta cada 5 segundos.
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;

  // Salud: latencia real de la base de datos.
  const t0 = Date.now();
  let dbOk = true, dbError = null;
  try { await sql("select 1"); } catch (e) { dbOk = false; dbError = String(e.message || e); }
  const dbLatency = Date.now() - t0;

  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    GOOGLE: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    FACEBOOK: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    API_FOOTBALL: !!(process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY),
    ADMIN_EMAILS: !!process.env.ADMIN_EMAILS,
  };

  const [k] = await q(`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where created_at >= date_trunc('day', now())) as users_today,
      (select count(*)::int from quinielas) as quinielas,
      (select count(*)::int from quinielas where created_at >= date_trunc('day', now())) as quinielas_today,
      (select count(*)::int from predictions) as predictions,
      (select count(*)::int from predictions where updated_at >= date_trunc('day', now())) as predictions_today,
      (select count(*)::int from chat_messages where created_at >= date_trunc('day', now())) as chat_today,
      (select count(*)::int from global_tickets t join global_draws d on d.id = t.draw_id where d.status = 'open') as tickets_open,
      (select count(*)::int from tournaments where status in ('open','running')) as tournaments_active,
      (select count(*)::int from ad_leads) as leads,
      (select count(*)::int from user_reports where created_at >= now() - interval '7 days') as reports_week,
      (select count(*)::int from gamescore where status = 'live') as games_live
  `, [], [{}]);

  // Eventos de todas las tablas (para el feed y la gráfica por minuto).
  const events = await q(`
    select * from (
      select 'registro' as kind, u.created_at as at, u.name as who, coalesce(u.oauth_provider, 'correo') as detail from users u
      union all
      select 'quiniela', q.created_at, u.name, q.name from quinielas q join users u on u.id = q.owner_id
      union all
      select 'union', m.joined_at, u.name, q.name from quiniela_members m join users u on u.id = m.user_id join quinielas q on q.id = m.quiniela_id where m.role = 'member'
      union all
      select 'pronostico', p.updated_at, u.name, g.home_team || ' ' || p.home_pred || '-' || p.away_pred || ' ' || g.away_team
        from predictions p join users u on u.id = p.user_id join quiniela_games g on g.id = p.quiniela_game_id
      union all
      select 'chat', c.created_at, u.name, left(c.body, 60) from chat_messages c join users u on u.id = c.user_id
      union all
      select 'boleto', t.submitted_at, u.name, 'Sorteo #' || t.draw_id from global_tickets t join users u on u.id = t.user_id
      union all
      select 'torneo', e.joined_at, u.name, t.name from tournament_entries e join users u on u.id = e.user_id join tournaments t on t.id = e.tournament_id
      union all
      select 'lead', l.created_at, l.company, l.email from ad_leads l
      union all
      select 'reporte', r.created_at, u.name, r.kind || coalesce(': ' || r.reason, '') from user_reports r join users u on u.id = r.reporter_id
    ) ev
    where at >= now() - interval '7 days'
    order by at desc
    limit 60
  `);

  const series = await q(`
    with mins as (
      select generate_series(date_trunc('minute', now()) - interval '29 minutes', date_trunc('minute', now()), interval '1 minute') as m
    ), ev as (
      select updated_at as at from predictions where updated_at >= now() - interval '30 minutes'
      union all select created_at from chat_messages where created_at >= now() - interval '30 minutes'
      union all select submitted_at from global_tickets where submitted_at >= now() - interval '30 minutes'
      union all select created_at from users where created_at >= now() - interval '30 minutes'
      union all select joined_at from quiniela_members where joined_at >= now() - interval '30 minutes'
    )
    select to_char(m, 'HH24:MI') as label, (select count(*)::int from ev where date_trunc('minute', ev.at) = mins.m) as n
    from mins order by m
  `);

  const [active] = await q(`
    select count(distinct uid)::int as n from (
      select user_id as uid from predictions where updated_at >= now() - interval '15 minutes'
      union select user_id from chat_messages where created_at >= now() - interval '15 minutes'
      union select user_id from global_tickets where submitted_at >= now() - interval '15 minutes'
      union select user_id from quiniela_members where joined_at >= now() - interval '15 minutes'
    ) x
  `, [], [{ n: 0 }]);

  // API-Football: plan, consultas usadas hoy y última sincronización.
  let football = { configured: hasKey() };
  if (hasKey()) {
    try {
      football = { configured: true, ok: true, ...(await accountStatus()) };
    } catch (e) {
      football = { configured: true, ok: false, error: String(e.message || e) };
    }
    football.lastSync = await lastSync();
  }

  return ok({
    football,
    now: new Date().toISOString(),
    health: { dbOk, dbError, dbLatency, env },
    kpis: { ...k, active15: active ? active.n : 0 },
    lastEventAt: events[0] ? events[0].at : null,
    events,
    series,
  });
}
