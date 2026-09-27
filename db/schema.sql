-- Quinielapp — esquema inicial para Neon (Postgres)
-- Corre esto una vez contra tu base de Neon (ver README: "Crear las tablas").
-- Cubre lo mínimo para arrancar pruebas: usuarios + marcador de partidos (gamescore).
-- Quinielas privadas, torneos y el sorteo global se agregan en una siguiente pasada
-- una vez que este primer corte esté probado en Vercel.

create extension if not exists "pgcrypto";

-- ---------- Usuarios ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,           -- bcrypt, nunca texto plano
  birthdate     date not null,
  avatar        text default '🦁',
  plan          text not null default 'free' check (plan in ('free', 'premium')),
  created_at    timestamptz not null default now()
);

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
