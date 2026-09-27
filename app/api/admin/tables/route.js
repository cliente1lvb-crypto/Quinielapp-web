import { sql } from "../../../../lib/db";
import { ok } from "../../../../lib/me";
import { requireAdmin } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

async function q(text) { try { return await sql(text); } catch (e) { return { error: String(e.message || e) }; } }

// GET — listas para las pestañas Usuarios, Publicidad, Leads y Reportes.
export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const [users, ads, leads, reports, quinielas] = await Promise.all([
    q(`select u.name, u.email, u.plan, coalesce(u.oauth_provider, 'correo') as provider, u.created_at,
         (select count(*)::int from quiniela_members m where m.user_id = u.id) as quinielas
       from users u order by u.created_at desc limit 100`),
    q("select id, advertiser, placement, image_url, target_url, active, impressions, clicks, created_at from ads order by created_at desc"),
    q("select company, email, placement, created_at from ad_leads order by created_at desc limit 100"),
    q(`select r.kind, r.reason, r.created_at, a.name as reporter, b.name as reported, q.name as quiniela
         from user_reports r join users a on a.id = r.reporter_id
         left join users b on b.id = r.reported_id left join quinielas q on q.id = r.quiniela_id
        order by r.created_at desc limit 100`),
    q(`select q.name, q.code, q.created_at, u.name as owner,
         (select count(*)::int from quiniela_members m where m.quiniela_id = q.id) as members,
         (select count(*)::int from quiniela_games g where g.quiniela_id = q.id) as games
       from quinielas q join users u on u.id = q.owner_id order by q.created_at desc limit 100`),
  ]);
  return ok({ users, ads, leads, reports, quinielas });
}
