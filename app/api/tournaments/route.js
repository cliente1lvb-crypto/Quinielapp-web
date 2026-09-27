import { sql } from "../../../lib/db";
import { requireMe, ok, fail } from "../../../lib/me";

export const dynamic = "force-dynamic";

// GET /api/tournaments — torneos visibles (no borradores) con mi inscripción,
// mi lugar y el top 10 de cada uno.
export async function GET() {
  const { me, error } = await requireMe();
  if (error) return error;
  try {
    const ts = await sql(`
      select t.*, (select count(*)::int from tournament_entries e where e.tournament_id = t.id) as players,
             exists(select 1 from tournament_entries e where e.tournament_id = t.id and e.user_id = $1) as joined
        from tournaments t where t.status <> 'draft'
       order by case t.status when 'running' then 0 when 'open' then 1 else 2 end, t.starts_at desc`, [me.id]);
    const ids = ts.map(t => t.id);
    const st = ids.length ? await sql(`
      select tournament_id, user_id, name, avatar, hits from tournament_standings
       where tournament_id = any($1::uuid[]) order by hits desc, name`, [ids]) : [];
    const fmt = (d) => new Date(d).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
    return ok({
      tournaments: ts.map(t => {
        const rows = st.filter(s => s.tournament_id === t.id);
        const myIdx = rows.findIndex(r => r.user_id === me.id);
        return {
          id: t.id, db: true, name: t.name, emoji: t.emoji, region: t.region, description: t.description,
          status: t.status === "running" ? "En curso" : t.status === "open" ? "Abierto" : "Finalizado",
          dates: t.ends_at ? `Del ${fmt(t.starts_at)} al ${fmt(t.ends_at)}` : `Desde el ${fmt(t.starts_at)}`,
          participants: t.players, maxPlayers: t.max_players, prize: t.prize || "Por anunciar",
          joined: t.joined, yourRank: myIdx >= 0 ? myIdx + 1 : null,
          table: rows.slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.user_id === me.id ? "Tú" : r.name, avatar: r.avatar || "🦁", aciertos: r.hits })),
        };
      }),
    });
  } catch (e) { return fail(String(e.message || e), 500); }
}
