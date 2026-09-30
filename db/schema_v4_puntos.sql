-- Quinielapp — v4: nuevo sistema de puntos de las quinielas privadas.
-- 5 pts marcador exacto · 3 pts acertar ganador o empate · 0 pts fallar.
-- (La app también lo aplica sola al arrancar; correrlo a mano es opcional.)
create or replace view quiniela_standings as
select
  m.quiniela_id,
  m.user_id,
  u.name,
  u.avatar,
  coalesce(sum(
    case
      when g.id is null or p.user_id is null or g.home_score is null or g.away_score is null
           or g.status = 'scheduled' then 0
      when p.home_pred = g.home_score and p.away_pred = g.away_score then 5
      when sign(p.home_pred - p.away_pred) = sign(g.home_score - g.away_score) then 3
      else 0
    end
  ), 0)::int as points,
  count(p.user_id)::int as predictions_made
from quiniela_members m
join users u on u.id = m.user_id
left join quiniela_games g on g.quiniela_id = m.quiniela_id
left join predictions p on p.quiniela_game_id = g.id and p.user_id = m.user_id
group by m.quiniela_id, m.user_id, u.name, u.avatar;
