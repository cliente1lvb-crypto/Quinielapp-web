-- Quinielapp — esquema v3: torneos (nacionales / regionales) para el panel de
-- administración. Córrelo DESPUÉS de schema.sql y schema_v2_quinielas.sql.
-- Se puede correr varias veces sin romper nada.

-- ---------- Torneos ----------
-- Un torneo junta varios sorteos de la Quiniela Global dentro de sus fechas:
-- la tabla del torneo es la suma de aciertos de sus participantes en esos sorteos.
-- region: "Nacional" o el nombre de la región (CDMX, Jalisco, Nuevo León...).
create table if not exists tournaments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  emoji        text not null default '🏆',
  region       text not null default 'Nacional',
  description  text,
  prize        text,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  max_players  integer check (max_players is null or max_players > 0),
  status       text not null default 'open'
                check (status in ('draft', 'open', 'running', 'finished')),
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_tournaments_status on tournaments(status);

create table if not exists tournament_entries (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
create index if not exists idx_tentries_user on tournament_entries(user_id);

-- Fecha real de cada sorteo para saber a qué torneo pertenece
-- (si no tiene closes_at, se usa la fecha en que se creó).
create index if not exists idx_global_draws_closes on global_draws(closes_at);

-- Tabla de cada torneo (se calcula sola).
create or replace view tournament_standings as
select
  e.tournament_id,
  e.user_id,
  u.name,
  u.avatar,
  coalesce(sum(r.hits), 0)::int as hits,
  count(r.draw_id)::int as draws_played
from tournament_entries e
join tournaments t on t.id = e.tournament_id
join users u on u.id = e.user_id
left join global_draws d
  on coalesce(d.closes_at, d.created_at) >= t.starts_at
 and (t.ends_at is null or coalesce(d.closes_at, d.created_at) <= t.ends_at)
left join global_ranking r on r.draw_id = d.id and r.user_id = e.user_id
group by e.tournament_id, e.user_id, u.name, u.avatar;
