import { sql } from "../../../../lib/db";
import { requireMe, ok, fail } from "../../../../lib/me";
import { listQuinielasFor, isMember, UUID_RE } from "../../../../lib/quinielas";

export const dynamic = "force-dynamic";

// GET /api/quinielas/:id — detalle completo: partidos, tabla, mis pronósticos,
// miembros y chat.
export async function GET(_req, { params }) {
  const { me, error } = await requireMe();
  if (error) return error;
  const id = params.id;
  if (!UUID_RE.test(id)) return fail("Quiniela no válida.", 404);
  try {
    const role = await isMember(id, me.id);
    if (!role) return fail("No eres miembro de esta quiniela.", 403);

    const [quiniela] = await listQuinielasFor(me.id, id);
    const standings = await sql(
      `select s.user_id, s.name, s.avatar, s.points, s.predictions_made
         from quiniela_standings s where s.quiniela_id = $1
        order by s.points desc, s.name`,
      [id]
    );
    const members = await sql(
      `select m.user_id, m.role, u.name, u.avatar
         from quiniela_members m join users u on u.id = m.user_id
        where m.quiniela_id = $1 order by (m.role = 'owner') desc, m.joined_at`,
      [id]
    );
    const picks = await sql(
      `select p.quiniela_game_id, p.home_pred, p.away_pred
         from predictions p join quiniela_games g on g.id = p.quiniela_game_id
        where g.quiniela_id = $1 and p.user_id = $2`,
      [id, me.id]
    );
    const chat = await sql(
      `select * from (
         select c.id, c.user_id, c.body, c.is_sticker, c.created_at, u.name, u.avatar
           from chat_messages c join users u on u.id = c.user_id
          where c.quiniela_id = $1
          order by c.created_at desc limit 100
       ) t order by created_at asc`,
      [id]
    );
    return ok({
      quiniela,
      me: { id: me.id, name: me.name },
      standings: standings.map(s => ({ ...s, me: s.user_id === me.id })),
      members,
      myPicks: Object.fromEntries(picks.map(p => [p.quiniela_game_id, { h: p.home_pred, a: p.away_pred, saved: true }])),
      chat: chat.map(c => ({
        id: c.id, userId: c.user_id, from: c.user_id === me.id ? "Tú" : c.name,
        text: c.body, sticker: c.is_sticker, me: c.user_id === me.id, at: c.created_at,
      })),
    });
  } catch (e) {
    return fail(String(e.message || e), 500);
  }
}
