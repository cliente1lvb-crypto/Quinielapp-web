-- Quinielapp — esquema v2: quinielas privadas, pronósticos, chat, Quiniela Global,
-- amigos, reportes y contactos de anunciantes.
-- Córrelo DESPUÉS de db/schema.sql (usa las tablas users y gamescore).
-- Se puede correr varias veces sin romper nada (todo es "if not exists" / "on conflict").

-- ---------- Quinielas privadas ----------
-- code: el código corto que va en el link de invitación (?unirse=CODE).
create table if not exists quinielas (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  emoji        text not null default '🏆',
  owner_id     uuid not null references users(id) on delete cascade,
  max_members  integer not null default 15 check (max_members between 2 and 100),
  period       text not null default 'weekend',     -- "weekend" | "week" | "custom"
  status       text not null default 'open'
                check (status in ('open', 'live', 'finished')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_quinielas_owner on quinielas(owner_id);

-- ---------- Miembros de cada quiniela ----------
create table if not exists quiniela_members (
  quiniela_id  uuid not null references quinielas(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (quiniela_id, user_id)
);
create index if not exists idx_members_user on quiniela_members(user_id);

-- ---------- Partidos de cada quiniela ----------
-- Se guarda una copia del partido (equipos, liga, hora) para que la quiniela
-- funcione aunque el partido todavía no esté en gamescore. gamescore_id enlaza
-- con el marcador en vivo cuando exista.
create table if not exists quiniela_games (
  id            uuid primary key default gen_random_uuid(),
  quiniela_id   uuid not null references quinielas(id) on delete cascade,
  gamescore_id  uuid references gamescore(id) on delete set null,
  home_team     text not null,
  away_team     text not null,
  league        text,
  kickoff_label text,                    -- "Dom 7:00 AM" tal como se muestra en la app
  kickoff_at    timestamptz,             -- cierre de pronósticos
  home_score    integer,
  away_score    integer,
  status        text not null default 'scheduled'
                 check (status in ('scheduled', 'live', 'finished')),
  match_minute  text,
  sort_order    integer not null default 0
);
create index if not exists idx_qgames_quiniela on quiniela_games(quiniela_id);

-- ---------- Pronósticos (marcador exacto) ----------
create table if not exists predictions (
  quiniela_game_id uuid not null references quiniela_games(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  home_pred        integer not null check (home_pred between 0 and 20),
  away_pred        integer not null check (away_pred between 0 and 20),
  updated_at       timestamptz not null default now(),
  primary key (quiniela_game_id, user_id)
);
create index if not exists idx_predictions_user on predictions(user_id);

-- ---------- Tabla de posiciones (se calcula sola) ----------
-- Reglas de la app: 3 pts marcador exacto · 1 pt acertar ganador o empate · 0 fallar.
-- Cuenta partidos en vivo (tabla en tiempo real) y terminados.
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
      when p.home_pred = g.home_score and p.away_pred = g.away_score then 3
      when sign(p.home_pred - p.away_pred) = sign(g.home_score - g.away_score) then 1
      else 0
    end
  ), 0)::int as points,
  count(p.user_id)::int as predictions_made
from quiniela_members m
join users u on u.id = m.user_id
left join quiniela_games g on g.quiniela_id = m.quiniela_id
left join predictions p on p.quiniela_game_id = g.id and p.user_id = m.user_id
group by m.quiniela_id, m.user_id, u.name, u.avatar;

-- ---------- Chat de cada quiniela ----------
create table if not exists chat_messages (
  id           bigserial primary key,
  quiniela_id  uuid not null references quinielas(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  is_sticker   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_chat_quiniela on chat_messages(quiniela_id, created_at);

-- ---------- Quiniela Global (estilo ProGol) ----------
-- Un sorteo por semana, 10 partidos, se pronostica L / E / V.
create table if not exists global_draws (
  id         integer primary key,          -- número de sorteo, ej. 2461
  closes_at  timestamptz,
  close_label text,                        -- "Vie 21 Ago, 6:00 PM"
  status     text not null default 'open' check (status in ('open', 'closed', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists global_draw_matches (
  draw_id    integer not null references global_draws(id) on delete cascade,
  n          smallint not null check (n between 1 and 14),
  home_team  text not null,
  away_team  text not null,
  league     text,
  result     char(1) check (result in ('L', 'E', 'V')),   -- NULL hasta que termine
  primary key (draw_id, n)
);

-- picks: {"1":"L","2":"E",...,"10":"V"}
create table if not exists global_tickets (
  draw_id      integer not null references global_draws(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  picks        jsonb not null,
  submitted_at timestamptz not null default now(),
  primary key (draw_id, user_id)
);

-- Aciertos por boleto (se calcula sola conforme se capturan resultados).
create or replace view global_ranking as
select
  t.draw_id,
  t.user_id,
  u.name,
  u.avatar,
  count(m.n) filter (where m.result is not null and t.picks ->> m.n::text = m.result)::int as hits
from global_tickets t
join users u on u.id = t.user_id
left join global_draw_matches m on m.draw_id = t.draw_id
group by t.draw_id, t.user_id, u.name, u.avatar;

-- Semilla: el sorteo que ya muestra la app.
insert into global_draws (id, close_label) values (2461, 'Vie 21 Ago, 6:00 PM')
on conflict (id) do nothing;

insert into global_draw_matches (draw_id, n, home_team, away_team, league) values
  (2461, 1,  'Arsenal FC',          'Coventry City',      'Premier League'),
  (2461, 2,  'Manchester City',     'AFC Bournemouth',    'Premier League'),
  (2461, 3,  'Atlético Madrid',     'Málaga CF',          'La Liga'),
  (2461, 4,  'Athletic Bilbao',     'Sevilla FC',         'La Liga'),
  (2461, 5,  'Paris Saint-Germain', 'Olympique Marsella', 'Ligue 1'),
  (2461, 6,  'AS Mónaco',           'Olympique Lyon',     'Ligue 1'),
  (2461, 7,  'Inter Milano',        'AC Monza',           'Serie A'),
  (2461, 8,  'AS Roma',             'ACF Fiorentina',     'Serie A'),
  (2461, 9,  'Bayern Munich',       'VfB Stuttgart',      'Bundesliga'),
  (2461, 10, 'Borussia Dortmund',   'Hamburger SV',       'Bundesliga')
on conflict (draw_id, n) do nothing;

-- ---------- Amigos (seguir) ----------
create table if not exists user_follows (
  follower_id  uuid not null references users(id) on delete cascade,
  followee_id  uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- ---------- Reportes y bloqueos (desde el chat) ----------
create table if not exists user_reports (
  id           bigserial primary key,
  reporter_id  uuid not null references users(id) on delete cascade,
  reported_id  uuid references users(id) on delete set null,
  quiniela_id  uuid references quinielas(id) on delete set null,
  kind         text not null check (kind in ('report', 'block')),
  reason       text,
  created_at   timestamptz not null default now()
);

-- ---------- Notificaciones ----------
create table if not exists notifications (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  icon        text not null default '🔔',
  title       text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);

-- ---------- Contactos de anunciantes ("Anúnciate con nosotros") ----------
create table if not exists ad_leads (
  id          bigserial primary key,
  company     text not null,
  email       text not null,
  placement   text,
  created_at  timestamptz not null default now()
);
