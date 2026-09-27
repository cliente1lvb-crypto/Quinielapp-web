-- Quinielapp — esquema inicial para Neon (Postgres)
-- Corre esto una vez contra tu base de Neon (ver README: "Crear las tablas").
-- Cubre lo mínimo para arrancar pruebas: usuarios + marcador de partidos (gamescore).
-- Quinielas privadas, torneos y el sorteo global se agregan en una siguiente pasada
-- una vez que este primer corte esté probado en Vercel.

create extension if not exists "pgcrypto";

-- ---------- Usuarios ----------
-- password_hash y birthdate son NULL para cuentas que entran por Google/Facebook
-- (nunca tuvieron que escribir una contraseña ni llenar el formulario de registro).
-- oauth_provider guarda de dónde vino la cuenta ("google", "facebook", o NULL si
-- se registró con correo y contraseña) — solo informativo, no se usa para validar.
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text,                    -- bcrypt; NULL en cuentas OAuth
  birthdate     date,                    -- NULL en cuentas OAuth (no lo piden esos flujos)
  avatar        text default '🦁',
  avatar_url    text,                    -- foto de perfil de Google/Facebook, si la hay
  oauth_provider text,                   -- "google" | "facebook" | NULL
  plan          text not null default 'free' check (plan in ('free', 'premium')),
  created_at    timestamptz not null default now()
);

-- Si ya habías corrido este esquema antes de agregar login con Google/Facebook,
-- estas líneas ponen tu tabla al día sin perder los usuarios que ya tenías.
alter table users alter column password_hash drop not null;
alter table users alter column birthdate drop not null;
alter table users add column if not exists avatar_url text;
alter table users add column if not exists oauth_provider text;

-- ---------- Ligas (catálogo fijo de las 5 grandes + Champions League) ----------
create table if not exists leagues (
  id     serial primary key,
  name   text not null unique,           -- "Premier League", "La Liga", ...
  country_flag text
);

-- ---------- Marcador de partidos (gamescore) ----------
-- Una fila por partido sincronizado desde el proveedor de datos deportivos
-- (ver la integración de API-Football documentada en QuinielappClient.js).
create table if not exists gamescore (
  id            uuid primary key default gen_random_uuid(),
  league_id     integer references leagues(id),
  home_team     text not null,
  away_team     text not null,
  home_score    integer,                 -- null = todavía no arranca
  away_score    integer,
  status        text not null default 'scheduled'
                 check (status in ('scheduled', 'live', 'finished')),
  match_minute  text,                    -- "67'" en vivo, u hora programada
  kickoff_at    timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists idx_gamescore_status on gamescore(status);
create index if not exists idx_gamescore_league on gamescore(league_id);

-- ---------- Semilla mínima de ligas ----------
insert into leagues (name, country_flag) values
  ('Premier League', '🏴'),
  ('La Liga', '🇪🇸'),
  ('Serie A', '🇮🇹'),
  ('Bundesliga', '🇩🇪'),
  ('Ligue 1', '🇫🇷'),
  ('Champions League', '⭐')
on conflict (name) do nothing;
