"use client";
import React, { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Trophy, Plus, Users, MessageCircle, Home as HomeIcon, X, Send, Crown, ChevronRight, Settings, Shield, Smile, Bell, LogOut, Camera, Inbox, BarChart3, Trash2, Flag, MoreVertical, Megaphone, Mail } from "lucide-react";

// ---------- Design tokens ----------
// Estilo casa de apuestas: negro profundo, verde neón como acento "momios", rojo vivo para en vivo
const COLORS = {
  bg: "#0A0D0B",
  bgCard: "#151916",
  bgCardAlt: "#1C211D",
  line: "#2A302B",
  gold: "#2BE87A",
  goldSoft: "#2BE87A22",
  cream: "#F2F5F2",
  creamDim: "#8C958E",
  live: "#FF3B3B",
  teal: "#1AA3A3",
};

// Glassmorphism quirúrgico (tendencia 2026): solo en superficies flotantes —
// hojas inferiores, paneles y menús contextuales — nunca en el fondo principal.
const GLASS = {
  background: "rgba(21, 25, 22, 0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
};

// ---------- Integración con API-Football (marcador en tiempo real) ----------
// Investigación: de las opciones evaluadas (API-Football, football-data.org,
// TheStatsAPI), API-Football es la única con marcador realmente en vivo a precio
// accesible — actualiza cada ~15 segundos, cubre las 5 grandes ligas + Champions
// League, y tiene plan de entrada desde $10/mes tras el nivel gratuito de desarrollo.
//
// En producción esta llamada la hace el backend, nunca el cliente — la app nunca
// debe traer la key de API-Football dentro del bundle. Aquí queda documentado el
// mapeo exacto de campos para que un desarrollador lo conecte directo al backend.
const SPORTS_API = {
  baseUrl: "https://v3.football.api-sports.io",
  apiKey: null, // null en este prototipo = sigue usando los datos mock de abajo
  leagueIds: {
    "Premier League": 39,
    "La Liga": 140,
    "Serie A": 135,
    "Bundesliga": 78,
    "Ligue 1": 61,
    "Champions League": 2,
  },
};

// GET /fixtures?live=all&league={id}  → partidos en vivo de esa liga ahora mismo
async function fetchLiveFixtures(leagueName) {
  const leagueId = SPORTS_API.leagueIds[leagueName];
  if (!SPORTS_API.apiKey || !leagueId) return [];
  const res = await fetch(`${SPORTS_API.baseUrl}/fixtures?live=all&league=${leagueId}`, {
    headers: { "x-apisports-key": SPORTS_API.apiKey },
  });
  const data = await res.json();
  return (data.response || []).map(mapApiFixtureToGame);
}

// Traduce la forma de respuesta de API-Football a la forma interna que ya usa
// toda la UI ({ home, away, hs, as, live, min, league }) para no tener que tocar
// ninguna pantalla cuando se conecte el backend real.
function mapApiFixtureToGame(fixture) {
  const started = fixture.fixture.status.short !== "NS";
  return {
    home: fixture.teams.home.name,
    away: fixture.teams.away.name,
    hs: started ? fixture.goals.home : null,
    as: started ? fixture.goals.away : null,
    live: started && fixture.fixture.status.short !== "FT",
    min: started ? `${fixture.fixture.status.elapsed}'` : new Date(fixture.fixture.date).toLocaleString("es-MX", { weekday: "short", hour: "2-digit", minute: "2-digit" }),
    league: Object.keys(SPORTS_API.leagueIds).find(k => SPORTS_API.leagueIds[k] === fixture.league.id) || fixture.league.name,
  };
}

// Hook de polling: mientras haya partidos "en vivo" en pantalla, refresca cada 15s
// (la cadencia real de actualización de API-Football). Sin SPORTS_API.apiKey
// configurada, no llama nada y la pantalla se queda con los datos mock tal cual —
// así el prototipo funciona igual antes y después de conectar el backend real.
function useLiveScores(initialGames) {
  const [games, setGames] = useState(initialGames);
  useEffect(() => {
    setGames(initialGames);
    if (!SPORTS_API.apiKey) return;
    const leaguesInPlay = [...new Set(initialGames.filter(g => g.live).map(g => g.league))];
    if (leaguesInPlay.length === 0) return;
    let cancelled = false;
    const poll = async () => {
      const updates = (await Promise.all(leaguesInPlay.map(fetchLiveFixtures))).flat();
      if (cancelled) return;
      setGames(prev => prev.map(g => {
        const match = updates.find(u => u.home === g.home && u.away === g.away);
        return match ? { ...g, hs: match.hs, as: match.as, live: match.live, min: match.min } : g;
      }));
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [initialGames]);
  return games;
}

// ---------- Mock data ----------
const QUINIELAS = [
  {
    id: 1,
    name: "Liga MX J5",
    emoji: "⚽",
    members: 12,
    max: 15,
    pot: 12,
    status: "En vivo",
    leader: "Karla",
    you: 2,
    games: [
      { id: 1, home: "América", away: "Cruz Azul", hs: 2, as: 1, min: "78'", live: true, league: "Liga MX" },
      { id: 2, home: "Chivas", away: "Pumas", hs: 0, as: 0, min: "12'", live: true, league: "Liga MX" },
      { id: 3, home: "Manchester City", away: "AFC Bournemouth", hs: null, as: null, min: "Dom 7:00 AM", live: false, league: "Premier League" },
    ],
  },
  {
    id: 2,
    name: "Fin de Semana con la Banda",
    emoji: "🏆",
    members: 8,
    max: 15,
    pot: 8,
    status: "Por comenzar",
    leader: "—",
    you: null,
    games: [
      { id: 4, home: "León", away: "Toluca", hs: null, as: null, min: "Dom 12:00", live: false, league: "Liga MX" },
      { id: 5, home: "Santos", away: "Pachuca", hs: null, as: null, min: "Dom 17:00", live: false, league: "Liga MX" },
    ],
  },
];

const LEADERBOARD = [
  { name: "Karla", pts: 14, avatar: "🦊" },
  { name: "Diego", pts: 13, avatar: "🐯" },
  { name: "Tú", pts: 11, avatar: "🦁" },
  { name: "Memo", pts: 9, avatar: "🐼" },
  { name: "Ana", pts: 7, avatar: "🐨" },
];

const STICKERS = ["🔥", "😭", "🐐", "🍺", "😤", "🙌", "⚽", "💀"];

const CHAT = [
  { from: "Karla", text: "¡Se les fue el América otra vez! 😭", me: false },
  { from: "Diego", text: "🐐", me: false, sticker: true },
  { from: "Tú", text: "Ya nomás falta que Chivas empate y me caigo del 1er lugar", me: true },
  { from: "Memo", text: "🔥", me: false, sticker: true },
];

// Fixtures reales de las ligas más importantes del mundo (via conector de datos deportivos).
// En producción esto lo llena un job que sincroniza con el proveedor de datos cada pocos
// minutos y guarda resultado/estado en la base de datos de la quiniela.
const LEAGUES = [
  {
    id: "epl",
    name: "Premier League",
    country: "🏴",
    premium: false,
    fixtures: [
      { id: "72221154", home: "Arsenal FC", away: "Coventry City", date: "Vie 21 Ago, 1:00 PM", fav: "ARS", favPct: 82.5, status: "scheduled" },
      { id: "72221156", home: "Hull City", away: "Manchester United", date: "Sáb 22 Ago, 5:30 AM", fav: "MUN", favPct: 67, status: "scheduled" },
      { id: "72221168", home: "Manchester City", away: "AFC Bournemouth", date: "Dom 23 Ago, 7:00 AM", fav: "MCI", favPct: 65.6, status: "scheduled" },
      { id: "72221170", home: "Newcastle United", away: "Liverpool FC", date: "Dom 23 Ago, 9:30 AM", fav: "LFC", favPct: 46, status: "scheduled" },
      { id: "72221172", home: "Fulham FC", away: "Chelsea FC", date: "Lun 24 Ago, 1:00 PM", fav: "CFC", favPct: 43.4, status: "scheduled" },
    ],
  },
  {
    id: "laliga",
    name: "La Liga",
    country: "🇪🇸",
    premium: false,
    fixtures: [
      { id: "72478446", home: "Deportivo Alavés", away: "Getafe CF", date: "Sáb 15 Ago, 11:30 AM", fav: "ALA", favPct: 40, status: "scheduled" },
      { id: "72478448", home: "Atlético Madrid", away: "Málaga CF", date: "Mié 19 Ago, 1:00 PM", fav: "ATM", favPct: 73.6, status: "scheduled" },
      { id: "72478486", home: "Athletic Bilbao", away: "Sevilla FC", date: "Sáb 22 Ago, 9:00 AM", fav: "ATH", favPct: 59, status: "scheduled" },
      { id: "72478490", home: "Real Betis", away: "Real Sociedad", date: "Vie 21 Ago, 1:00 PM", fav: "RBB", favPct: 43.4, status: "scheduled" },
    ],
  },
  {
    id: "seriea",
    name: "Serie A",
    country: "🇮🇹",
    premium: false,
    fixtures: [
      { id: "71944898", home: "Inter Milano", away: "AC Monza", date: "Sáb 22 Ago, 10:30 AM", fav: "INT", favPct: 79.3, status: "scheduled" },
      { id: "71944896", home: "Genoa CFC", away: "SSC Napoli", date: "Sáb 22 Ago, 12:45 PM", fav: "NAP", favPct: 51.6, status: "scheduled" },
      { id: "71944904", home: "Torino FC", away: "AC Milan", date: "Dom 23 Ago, 12:45 PM", fav: "ACM", favPct: 53.7, status: "scheduled" },
      { id: "71944902", home: "AS Roma", away: "ACF Fiorentina", date: "Lun 24 Ago, 12:45 PM", fav: "ROM", favPct: 61.5, status: "scheduled" },
    ],
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    country: "🇩🇪",
    premium: false,
    fixtures: [
      { id: "72513148", home: "Bayern Munich", away: "VfB Stuttgart", date: "Vie 28 Ago, 12:30 PM", fav: "BMU", favPct: 74.4, status: "scheduled" },
      { id: "72513150", home: "Borussia Dortmund", away: "Hamburger SV", date: "Sáb 29 Ago, 10:30 AM", fav: "BVB", favPct: 72.1, status: "scheduled" },
      { id: "72513164", home: "SV Elversberg", away: "Bayer Leverkusen", date: "Sáb 29 Ago, 7:30 AM", fav: "LEV", favPct: 61.9, status: "scheduled" },
    ],
  },
  {
    id: "ucl",
    name: "Champions League",
    country: "⭐",
    premium: false,
    fixtures: [
      { id: "73007630", home: "Sparta Prague", away: "Olympique Lyon", date: "Mar 4 Ago", status: "final", hs: 2, as: 1 },
      { id: "73007726", home: "Dinamo Zagreb", away: "Kauno Žalgiris", date: "Mar 4 Ago", status: "final", hs: 5, as: 0 },
      { id: "73276980", home: "Fenerbahçe", away: "Sturm Graz", date: "Mié 5 Ago, 12:00 PM", fav: "FEN", favPct: 70.3, status: "scheduled" },
    ],
  },
  {
    id: "ligue1",
    name: "Ligue 1",
    country: "🇫🇷",
    premium: true,
    fixtures: [
      { id: "l1-1", home: "Paris Saint-Germain", away: "Olympique Marsella", date: "Sáb 22 Ago, 1:00 PM", fav: "PSG", favPct: 71, status: "scheduled" },
      { id: "l1-2", home: "AS Mónaco", away: "Olympique Lyon", date: "Dom 23 Ago, 10:00 AM", fav: "MON", favPct: 48, status: "scheduled" },
    ],
  },
  {
    id: "mls",
    name: "MLS",
    country: "🇺🇸",
    premium: true,
    fixtures: [
      { id: "mls-1", home: "Inter Miami CF", away: "LA Galaxy", date: "Sáb 22 Ago, 6:00 PM", fav: "MIA", favPct: 55, status: "scheduled" },
      { id: "mls-2", home: "Seattle Sounders", away: "LAFC", date: "Dom 23 Ago, 5:00 PM", fav: "LAFC", favPct: 44, status: "scheduled" },
    ],
  },
];

// Planes de suscripción — sin tokens, límites por plan
const PLANS = {
  free: { name: "Gratis", price: 0, maxLeagues: 5, maxGames: 10 },
  premium: { name: "Premium", price: 1, maxLeagues: 10, maxGames: 20 },
};

const NOTIFICATIONS = [
  { id: 1, icon: "👑", title: "Diego te rebasó en \"Liga MX J5\"", time: "Hace 12 min", unread: true },
  { id: 2, icon: "⏰", title: "Faltan 30 min para que cierre tu pronóstico de Bayern vs VfB Stuttgart", time: "Hace 40 min", unread: true },
  { id: 3, icon: "🎉", title: "Karla se unió a \"Fin de Semana con la Banda\"", time: "Hoy", unread: true },
  { id: 4, icon: "⚽", title: "Empezó América vs Cruz Azul — revisa el marcador en vivo", time: "Hoy", unread: false },
  { id: 5, icon: "🏆", title: "Ganaste \"Liga MX J3\" con 14 puntos", time: "Ayer", unread: false },
];

const PAST_QUINIELAS = [
  {
    id: 101, name: "Liga MX J3", emoji: "⚽", members: 10,
    winner: { name: "Tú", avatar: "🦁", pts: 14 },
    table: [
      { name: "Tú", pts: 14, avatar: "🦁" },
      { name: "Karla", pts: 12, avatar: "🦊" },
      { name: "Diego", pts: 9, avatar: "🐯" },
    ],
  },
  {
    id: 102, name: "Champions Week 1", emoji: "⭐", members: 8,
    winner: { name: "Memo", avatar: "🐼", pts: 11 },
    table: [
      { name: "Memo", pts: 11, avatar: "🐼" },
      { name: "Tú", pts: 8, avatar: "🦁" },
      { name: "Ana", pts: 6, avatar: "🐨" },
    ],
  },
];

// Quiniela global estilo ProGol: un "sorteo" semanal generado automático —
// 2 partidos de cada una de las 5 grandes ligas (sin curaduría manual del equipo
// en esta primera versión). Se pronostica L (local) / E (empate) / V (visitante).
//
// Regla de relleno (invisible para el usuario): si alguna de las 5 grandes ligas
// está en descanso esa semana (fin de temporada, fecha FIFA, etc.), sus 2 lugares
// se llenan con partidos de un orden de ligas de respaldo, para que el sorteo
// siempre tenga 10 partidos: 1) Champions League  2) Liga MX  3) MLS  4) Eredivisie / Primeira Liga
const GLOBAL_SORTEO = {
  numero: 2461,
  cierra: "Vie 21 Ago, 6:00 PM",
  partidos: [
    { n: 1, home: "Arsenal FC", away: "Coventry City", league: "Premier League" },
    { n: 2, home: "Manchester City", away: "AFC Bournemouth", league: "Premier League" },
    { n: 3, home: "Atlético Madrid", away: "Málaga CF", league: "La Liga" },
    { n: 4, home: "Athletic Bilbao", away: "Sevilla FC", league: "La Liga" },
    { n: 5, home: "Paris Saint-Germain", away: "Olympique Marsella", league: "Ligue 1" },
    { n: 6, home: "AS Mónaco", away: "Olympique Lyon", league: "Ligue 1" },
    { n: 7, home: "Inter Milano", away: "AC Monza", league: "Serie A" },
    { n: 8, home: "AS Roma", away: "ACF Fiorentina", league: "Serie A" },
    { n: 9, home: "Bayern Munich", away: "VfB Stuttgart", league: "Bundesliga" },
    { n: 10, home: "Borussia Dortmund", away: "Hamburger SV", league: "Bundesliga" },
  ],
};

const GLOBAL_RANKING = [
  { rank: 1, name: "ElPastorDeOro", avatar: "🐐", aciertos: 9, streak: 6 },
  { rank: 2, name: "Xolo_Fiel", avatar: "🐺", aciertos: 9, streak: 3 },
  { rank: 3, name: "reinamx10", avatar: "🦅", aciertos: 8, streak: 4 },
  { rank: 4, name: "Karla", avatar: "🦊", aciertos: 8, streak: 2 },
  { rank: 5, name: "cañoneroDiego", avatar: "🐯", aciertos: 7, streak: 1 },
  { rank: 6, name: "Memo", avatar: "🐼", aciertos: 7, streak: 0 },
  { rank: 7, name: "chiva_loca88", avatar: "🐐", aciertos: 6, streak: 2 },
  { rank: 8, name: "Ana", avatar: "🐨", aciertos: 6, streak: 1 },
];
const YOU_GLOBAL = { rank: 342, name: "Tú", avatar: "🦁", aciertos: 4, streak: 0, totalPlayers: 18420 };

// Torneos globales — competencias con fecha de inicio/fin y su propia tabla,
// separadas del sorteo semanal continuo.
const TOURNAMENTS = [
  {
    id: 1, name: "Torneo Apertura Global", emoji: "🏆", status: "En curso",
    dates: "Hasta el Dom 23 Ago", participants: 4820,
    prize: "Playera oficial + 3 meses Premium", joined: true, yourRank: 128,
    table: [
      { rank: 1, name: "reinamx10", avatar: "🦅", aciertos: 41 },
      { rank: 2, name: "ElPastorDeOro", avatar: "🐐", aciertos: 39 },
      { rank: 3, name: "Xolo_Fiel", avatar: "🐺", aciertos: 37 },
    ],
  },
  {
    id: 2, name: "Copa Champions Global", emoji: "⭐", status: "Abierto",
    dates: "Del Mar 2 Sep al Mar 21 Oct", participants: 1240,
    prize: "1 año de Premium gratis", joined: false, yourRank: null,
    table: [],
  },
  {
    id: 3, name: "Mundialito de Verano", emoji: "☀️", status: "Finalizado",
    dates: "Terminó el 10 Ago", participants: 9210,
    prize: "—", joined: true, yourRank: 512,
    table: [
      { rank: 1, name: "ElPastorDeOro", avatar: "🐐", aciertos: 88 },
      { rank: 2, name: "Memo", avatar: "🐼", aciertos: 84 },
      { rank: 3, name: "Karla", avatar: "🦊", aciertos: 81 },
    ],
  },
];

// ---------- Small UI pieces ----------
function PlanBadge({ plan }) {
  const isPremium = plan === "premium";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: isPremium ? COLORS.goldSoft : COLORS.bgCard,
      border: `1px solid ${isPremium ? COLORS.gold + "55" : COLORS.line}`,
      borderRadius: 999, padding: "6px 12px", color: isPremium ? COLORS.gold : COLORS.creamDim,
      fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
    }}>
      {isPremium && <Crown size={13} strokeWidth={2.5} />}
      {isPremium ? "Premium" : "Plan gratis"}
    </div>
  );
}

function ScoreDigit({ children }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono), 'Courier New', monospace", fontWeight: 700,
      fontSize: 22, color: COLORS.cream, letterSpacing: 1,
    }}>{children}</span>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "home", icon: HomeIcon, label: "Inicio" },
    { id: "quinielas", icon: Trophy, label: "Quinielas" },
    { id: "ranking", icon: BarChart3, label: "Ranking" },
    { id: "profile", icon: Users, label: "Perfil" },
  ];
  return (
    <div style={{
      display: "flex", borderTop: `1px solid ${COLORS.line}`,
      background: COLORS.bgCard, padding: "10px 8px 14px",
    }}>
      {items.map(it => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{
            flex: 1, background: "none", border: "none", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer",
            color: active ? COLORS.gold : COLORS.creamDim, padding: "4px 0",
          }}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Screens ----------
function LEVPicker({ value, onChange }) {
  const opts = [["L", "Local"], ["E", "Empate"], ["V", "Visitante"]];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {opts.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} title={label} style={{
          width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 12,
          border: `1.5px solid ${value === v ? COLORS.gold : COLORS.line}`,
          background: value === v ? COLORS.gold : COLORS.bg,
          color: value === v ? COLORS.bg : COLORS.creamDim,
        }}>{v}</button>
      ))}
    </div>
  );
}

function GlobalQuinielaCard({ joinedGlobal, onJoinGlobal }) {
  const [picks, setPicks] = useState({});
  const total = GLOBAL_SORTEO.partidos.length;
  const done = Object.keys(picks).length;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.bgCardAlt}, ${COLORS.bgCard})`,
      border: `1px solid ${COLORS.gold}44`, borderRadius: 16, padding: 16, marginBottom: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={16} color={COLORS.gold} />
          <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 13.5 }}>Quiniela Global · Sorteo #{GLOBAL_SORTEO.numero}</span>
        </div>
      </div>
      <div style={{ color: COLORS.creamDim, fontSize: 11, marginBottom: 14 }}>
        2 partidos de cada una de las 5 grandes ligas, generados automático cada semana. Pronostica L / E / V. Cierra {GLOBAL_SORTEO.cierra}.
      </div>

      {!joinedGlobal ? (
        <button onClick={onJoinGlobal} style={{
          width: "100%", background: COLORS.gold, border: "none", borderRadius: 10, padding: "11px 0",
          color: COLORS.bg, fontWeight: 800, fontSize: 13, cursor: "pointer",
        }}>Unirme a la Quiniela Global — gratis</button>
      ) : (
        <>
          {GLOBAL_SORTEO.partidos.map(p => (
            <div key={p.n} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: `1px solid ${COLORS.line}`,
            }}>
              <div style={{
                width: 18, textAlign: "center", color: COLORS.creamDim, fontWeight: 800,
                fontSize: 11, fontFamily: "var(--font-mono), 'Courier New', monospace",
              }}>{p.n}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: COLORS.cream, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.home} vs {p.away}
                </div>
                <div style={{ color: COLORS.creamDim, fontSize: 9.5 }}>{p.league}</div>
              </div>
              <LEVPicker value={picks[p.n]} onChange={(v) => setPicks(prev => ({ ...prev, [p.n]: v }))} />
            </div>
          ))}

          <button disabled={done < total} style={{
            width: "100%", marginTop: 12, background: done >= total ? COLORS.gold : COLORS.line, border: "none",
            borderRadius: 10, padding: "11px 0", color: done >= total ? COLORS.bg : COLORS.creamDim,
            fontWeight: 800, fontSize: 13, cursor: done >= total ? "pointer" : "default",
          }}>
            {done >= total ? "Enviar boleto" : `Faltan ${total - done} pronósticos`}
          </button>
        </>
      )}
    </div>
  );
}

function TournamentDetail({ t, onClose, onJoin }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <div style={{ fontSize: 20 }}>{t.emoji}</div>
        <div>
          <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>{t.name}</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11 }}>{t.dates} · {t.participants.toLocaleString("es-MX")} jugadores</div>
        </div>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        <div style={{
          background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 12,
          padding: 14, marginBottom: 16,
        }}>
          <div style={{ color: COLORS.creamDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Premio</div>
          <div style={{ color: COLORS.gold, fontWeight: 700, fontSize: 13 }}>{t.prize}</div>
          {t.joined && t.yourRank && (
            <div style={{ color: COLORS.creamDim, fontSize: 11.5, marginTop: 8 }}>Vas en el lugar <b style={{ color: COLORS.cream }}>#{t.yourRank}</b></div>
          )}
        </div>

        {!t.joined && t.status !== "Finalizado" && (
          <button onClick={onJoin} style={{
            width: "100%", background: COLORS.gold, border: "none", borderRadius: 12, padding: "12px 0",
            color: COLORS.bg, fontWeight: 800, fontSize: 13.5, cursor: "pointer", marginBottom: 16,
          }}>Unirme al torneo</button>
        )}

        <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          {t.status === "Finalizado" ? "Tabla final" : "Tabla del torneo"}
        </div>
        {t.table.length === 0 ? (
          <div style={{ color: COLORS.creamDim, fontSize: 12, textAlign: "center", padding: 20 }}>Aún no arranca — sé de los primeros en unirte.</div>
        ) : t.table.map(p => (
          <div key={p.rank} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 7,
            borderRadius: 12, background: p.rank <= 3 ? COLORS.goldSoft : COLORS.bgCard,
            border: `1px solid ${p.rank <= 3 ? COLORS.gold + "55" : COLORS.line}`,
          }}>
            <div style={{ width: 22, textAlign: "center", fontFamily: "var(--font-mono), 'Courier New', monospace", fontWeight: 800, color: p.rank === 1 ? COLORS.gold : COLORS.creamDim, fontSize: 13 }}>
              {p.rank <= 3 ? ["🥇", "🥈", "🥉"][p.rank - 1] : p.rank}
            </div>
            <div style={{ fontSize: 19 }}>{p.avatar}</div>
            <div style={{ flex: 1, color: COLORS.cream, fontWeight: 700, fontSize: 12.5 }}>{p.name}</div>
            <ScoreDigit>{p.aciertos}</ScoreDigit>
          </div>
        ))}
      </div>
    </div>
  );
}

function TorneosTab() {
  const [openTournament, setOpenTournament] = useState(null);
  const [joined, setJoined] = useState({});

  const statusColor = (s) => s === "En curso" ? COLORS.live : s === "Abierto" ? COLORS.gold : COLORS.creamDim;

  return (
    <div>
      <div style={{ color: COLORS.creamDim, fontSize: 11.5, marginBottom: 14, lineHeight: 1.5 }}>
        Compite en torneos globales con fecha de inicio y fin, tabla propia y premio al ganador.
      </div>
      {TOURNAMENTS.map(t => {
        const isJoined = joined[t.id] ?? t.joined;
        return (
          <button key={t.id} onClick={() => setOpenTournament({ ...t, joined: isJoined })} style={{
            width: "100%", textAlign: "left", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`,
            borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 22 }}>{t.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13.5 }}>{t.name}</div>
                <div style={{ color: COLORS.creamDim, fontSize: 11, marginTop: 2 }}>{t.dates} · {t.participants.toLocaleString("es-MX")} jugadores</div>
              </div>
              <ChevronRight size={17} color={COLORS.creamDim} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: statusColor(t.status),
                background: `${statusColor(t.status)}22`, padding: "3px 8px", borderRadius: 999,
              }}>{t.status === "En curso" && "● "}{t.status}</span>
              {isJoined && <span style={{ color: COLORS.gold, fontSize: 10.5, fontWeight: 700 }}>Ya estás dentro ✓</span>}
            </div>
          </button>
        );
      })}
      {openTournament && (
        <TournamentDetail
          t={openTournament}
          onClose={() => setOpenTournament(null)}
          onJoin={() => { setJoined(prev => ({ ...prev, [openTournament.id]: true })); setOpenTournament(prev => ({ ...prev, joined: true })); }}
        />
      )}
    </div>
  );
}

function RankingScreen({ onJoinGlobal, joinedGlobal }) {
  const [section, setSection] = useState("global"); // global | torneos

  return (
    <div style={{ padding: "20px 16px 16px", overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: COLORS.creamDim, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Ranking</div>
        <div style={{ color: COLORS.cream, fontSize: 24, fontWeight: 800, marginTop: 2 }}>Compite con todos</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["global", "Quiniela Global"], ["torneos", "Torneos"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: section === id ? COLORS.gold : COLORS.bgCard,
            color: section === id ? COLORS.bg : COLORS.creamDim, fontWeight: 700, fontSize: 12,
          }}>{label}</button>
        ))}
      </div>

      {section === "global" ? (
        <>
          <GlobalQuinielaCard joinedGlobal={joinedGlobal} onJoinGlobal={onJoinGlobal} />

          <AdBanner placement="ranking_banner" />

          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Top jugadores del sorteo</div>
          {GLOBAL_RANKING.map(p => (
            <div key={p.rank} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 7,
              borderRadius: 12, background: p.rank <= 3 ? COLORS.goldSoft : COLORS.bgCard,
              border: `1px solid ${p.rank <= 3 ? COLORS.gold + "55" : COLORS.line}`,
            }}>
              <div style={{
                width: 22, textAlign: "center", fontFamily: "var(--font-mono), 'Courier New', monospace", fontWeight: 800,
                color: p.rank === 1 ? COLORS.gold : COLORS.creamDim, fontSize: 13,
              }}>{p.rank <= 3 ? ["🥇", "🥈", "🥉"][p.rank - 1] : p.rank}</div>
              <div style={{ fontSize: 19 }}>{p.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 12.5 }}>{p.name}</div>
                {p.streak > 0 && (
                  <div style={{ color: COLORS.gold, fontSize: 10, marginTop: 1 }}>🔥 {p.streak} sorteos seguidos acertando</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <ScoreDigit>{p.aciertos}/10</ScoreDigit>
              </div>
            </div>
          ))}

          {joinedGlobal && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginTop: 4,
              borderRadius: 12, background: COLORS.bg, border: `1.5px dashed ${COLORS.gold}66`,
            }}>
              <div style={{
                width: 22, textAlign: "center", fontFamily: "var(--font-mono), 'Courier New', monospace", fontWeight: 800,
                color: COLORS.gold, fontSize: 12,
              }}>#{YOU_GLOBAL.rank}</div>
              <div style={{ fontSize: 19 }}>{YOU_GLOBAL.avatar}</div>
              <div style={{ flex: 1, color: COLORS.cream, fontWeight: 700, fontSize: 12.5 }}>{YOU_GLOBAL.name}</div>
              <ScoreDigit>{YOU_GLOBAL.aciertos}/10</ScoreDigit>
            </div>
          )}
        </>
      ) : (
        <TorneosTab />
      )}
    </div>
  );
}

function EmptyQuinielasState({ onCreate }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: "36px 20px", background: COLORS.bgCard, border: `1px dashed ${COLORS.line}`, borderRadius: 16,
    }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>🏆</div>
      <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Aún no tienes quinielas</div>
      <div style={{ color: COLORS.creamDim, fontSize: 12, marginBottom: 18, maxWidth: 240 }}>
        Crea tu primera quiniela y arma el pleito con tu banda para el próximo fin de semana.
      </div>
      <button onClick={onCreate} style={{
        background: COLORS.gold, border: "none", borderRadius: 999, padding: "10px 20px",
        color: COLORS.bg, fontWeight: 800, fontSize: 12.5, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
      }}><Plus size={14} strokeWidth={3} /> Crear mi primera quiniela</button>
    </div>
  );
}

function HomeScreen({ onOpenQuiniela, onCreate, fromFacebook, plan, onOpenPlan, onOpenNotifications, unreadCount }) {
  const [demoEmpty, setDemoEmpty] = useState(false);
  return (
    <div style={{ padding: "20px 16px 16px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ color: COLORS.creamDim, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>Qué tal, Rodrigo</div>
          <div style={{ color: COLORS.cream, fontSize: 30, fontWeight: 800, marginTop: 2, letterSpacing: -0.5 }}>Tu tablero</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onOpenNotifications} style={{
            position: "relative", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`,
            borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}>
            <Bell size={15} color={COLORS.creamDim} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -3, right: -3, background: COLORS.live, color: "#fff",
                fontSize: 9, fontWeight: 800, borderRadius: 999, minWidth: 15, height: 15,
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
              }}>{unreadCount}</span>
            )}
          </button>
          <button onClick={onOpenPlan} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <PlanBadge plan={plan} />
          </button>
        </div>
      </div>

      {fromFacebook && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, background: "#1877F218",
          border: "1px solid #1877F255", borderRadius: 12, padding: "10px 12px", marginBottom: 14,
        }}>
          <Users size={16} color="#4A9EFF" />
          <span style={{ color: COLORS.cream, fontSize: 11.5, flex: 1 }}>3 amigos de Facebook ya están en Quinielapp</span>
          <ChevronRight size={15} color={COLORS.creamDim} />
        </div>
      )}

      {/* Bento grid: agrupa el estado del usuario en tarjetas de distinto tamaño
          en vez de una sola tira de banners apilados — patrón que ya adoptaron
          los widgets de iOS y Fluent UI para escanear info relacionada más rápido. */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 22,
      }}>
        <div style={{
          gridColumn: "span 3", gridRow: "span 2",
          background: `linear-gradient(135deg, ${COLORS.bgCardAlt}, ${COLORS.bgCard})`,
          border: `1px solid ${COLORS.line}`, borderRadius: 18, padding: 18,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <Trophy size={24} color={COLORS.gold} strokeWidth={1.6} />
          <div>
            <div style={{ color: COLORS.creamDim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1 }}>Vas ganando en</div>
            <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 20, marginTop: 2, letterSpacing: -0.3 }}>0 quinielas</div>
            <div style={{ color: COLORS.creamDim, fontSize: 10.5 }}>esta semana</div>
          </div>
        </div>

        <div style={{
          gridColumn: "span 1", gridRow: "span 2",
          background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 18,
          padding: "14px 10px", display: "flex", flexDirection: "column",
          justifyContent: "space-between", alignItems: "center", textAlign: "center",
        }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <div>
            <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 22, fontFamily: "var(--font-mono), 'Courier New', monospace" }}>{QUINIELAS.length}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.3 }}>activas</div>
          </div>
        </div>

        <div style={{
          gridColumn: "span 2",
          background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 18,
          padding: "12px 14px",
        }}>
          <div style={{ color: COLORS.creamDim, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.8 }}>Sorteo Global</div>
          <div style={{ color: COLORS.cream, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>Cierra {GLOBAL_SORTEO.cierra}</div>
        </div>

        <div style={{
          gridColumn: "span 2",
          background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 18,
          padding: "12px 14px",
        }}>
          <div style={{ color: COLORS.creamDim, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.8 }}>Ranking global</div>
          <div style={{ color: COLORS.cream, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>Vas en el lugar #{YOU_GLOBAL.rank}</div>
        </div>
      </div>

      <AdBanner placement="home_banner" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 15 }}>Tus quinielas</span>
        <button onClick={onCreate} style={{
          display: "flex", alignItems: "center", gap: 4, background: COLORS.gold, color: COLORS.bg,
          border: "none", borderRadius: 999, padding: "7px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer",
        }}>
          <Plus size={14} strokeWidth={3} /> Crear
        </button>
      </div>

      {demoEmpty ? (
        <EmptyQuinielasState onCreate={onCreate} />
      ) : (
        QUINIELAS.map(q => (
          <button key={q.id} onClick={() => onOpenQuiniela(q)} style={{
            width: "100%", textAlign: "left", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`,
            borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 22 }}>{q.emoji}</div>
                <div>
                  <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 14 }}>{q.name}</div>
                  <div style={{ color: COLORS.creamDim, fontSize: 11, marginTop: 2 }}>
                    {q.members}/{q.max} amigos · {q.games.length} partidos · {new Set(q.games.map(g => g.league)).size} ligas
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color={COLORS.creamDim} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5,
                color: q.status === "En vivo" ? COLORS.live : COLORS.teal,
                background: q.status === "En vivo" ? `${COLORS.live}22` : `${COLORS.teal}33`,
                padding: "3px 8px", borderRadius: 999,
              }}>
                {q.status === "En vivo" && "● "}{q.status}
              </span>
              {q.leader !== "—" && (
                <span style={{ color: COLORS.creamDim, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <Crown size={12} color={COLORS.gold} /> {q.leader} al frente
                </span>
              )}
            </div>
          </button>
        ))
      )}

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <span onClick={() => setDemoEmpty(!demoEmpty)} style={{ color: COLORS.creamDim, fontSize: 10, textDecoration: "underline", cursor: "pointer" }}>
          {demoEmpty ? "Ver con quinielas (demo)" : "Ver estado vacío (demo)"}
        </span>
      </div>
    </div>
  );
}

function ReportBlockSheet({ from, onClose }) {
  const [action, setAction] = useState(null); // "report" | "block" | null
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const REASONS = ["Lenguaje ofensivo", "Acoso", "Spam", "Contenido inapropiado", "Otro"];

  if (done) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "#000000aa", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", zIndex: 20 }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          ...GLASS, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          width: "100%", padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
            {action === "block" ? `Bloqueaste a ${from}` : "Reporte enviado"}
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 11.5, marginBottom: 16 }}>
            {action === "block" ? "Ya no verás sus mensajes ni podrá agregarte a quinielas." : "Nuestro equipo lo va a revisar en las próximas horas."}
          </div>
          <button onClick={onClose} style={{
            width: "100%", background: COLORS.gold, border: "none", borderRadius: 10, padding: "11px 0",
            color: COLORS.bg, fontWeight: 800, fontSize: 13, cursor: "pointer",
          }}>Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000000aa", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", zIndex: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        ...GLASS, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        width: "100%", padding: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>{from}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={COLORS.creamDim} />
          </button>
        </div>

        {action === "report" ? (
          <>
            <div style={{ color: COLORS.creamDim, fontSize: 11, marginBottom: 10 }}>¿Por qué reportas a {from}?</div>
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{
                width: "100%", textAlign: "left", background: reason === r ? COLORS.goldSoft : COLORS.bg,
                border: `1px solid ${reason === r ? COLORS.gold : COLORS.line}`, borderRadius: 10,
                padding: "11px 12px", marginBottom: 8, color: COLORS.cream, fontSize: 12.5, cursor: "pointer",
              }}>{r}</button>
            ))}
            <button onClick={() => setDone(true)} disabled={!reason} style={{
              width: "100%", marginTop: 8, background: reason ? COLORS.live : COLORS.line, border: "none", borderRadius: 10,
              padding: "12px 0", color: reason ? "#fff" : COLORS.creamDim, fontWeight: 800, fontSize: 13,
              cursor: reason ? "pointer" : "default",
            }}>Enviar reporte</button>
          </>
        ) : (
          <>
            <button onClick={() => setAction("report")} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bg,
              border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 8, cursor: "pointer",
            }}>
              <Flag size={17} color={COLORS.creamDim} />
              <span style={{ color: COLORS.cream, fontSize: 13, fontWeight: 600 }}>Reportar mensaje</span>
            </button>
            <button onClick={() => { setAction("block"); setDone(true); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bg,
              border: `1px solid ${COLORS.live}55`, borderRadius: 12, padding: "13px 14px", cursor: "pointer",
            }}>
              <Shield size={17} color={COLORS.live} />
              <span style={{ color: COLORS.live, fontSize: 13, fontWeight: 700 }}>Bloquear a {from}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QuinielaDetail({ q, onBack }) {
  const [tab, setTab] = useState("marcador");
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState(CHAT);
  const [showInvite, setShowInvite] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showReport, setShowReport] = useState(null); // { from } | null
  const [picks, setPicks] = useState({}); // { gameId: { h, a, saved } }
  const games = useLiveScores(q.games); // marcador en vivo vía API-Football cuando hay key configurada

  const send = () => {
    if (!msg.trim()) return;
    setChat([...chat, { from: "Tú", text: msg, me: true }]);
    setMsg("");
  };

  const bump = (gameId, side, delta) => {
    setPicks(prev => {
      const cur = prev[gameId] || { h: 0, a: 0, saved: false };
      const next = { ...cur, [side]: Math.max(0, cur[side] + delta), saved: false };
      return { ...prev, [gameId]: next };
    });
  };

  const savePick = (gameId) => {
    setPicks(prev => ({ ...prev, [gameId]: { ...(prev[gameId] || { h: 0, a: 0 }), saved: true } }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
          <div style={{ fontSize: 20 }}>{q.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>{q.name}</div>
            <div style={{ color: COLORS.creamDim, fontSize: 11 }}>{q.members}/{q.max} amigos · {q.games.length} partidos</div>
          </div>
          <button onClick={() => setShowInvite(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <Users size={17} color={COLORS.gold} />
          </button>
          <button onClick={() => setShowManage(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <Settings size={17} color={COLORS.creamDim} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[["marcador", "Marcador"], ["pronosticos", "Pronósticos"], ["partidos", "Partidos"], ["chat", "Chat"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === id ? COLORS.gold : COLORS.bgCard,
              color: tab === id ? COLORS.bg : COLORS.creamDim,
              fontWeight: 700, fontSize: 12,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "marcador" && (
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, background: COLORS.bgCardAlt,
            border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "11px 13px", marginBottom: 14,
          }}>
            <Trophy size={15} color={COLORS.gold} style={{ flexShrink: 0 }} />
            <span style={{ color: COLORS.creamDim, fontSize: 11, lineHeight: 1.5 }}>
              <b style={{ color: COLORS.cream }}>3 pts</b> marcador exacto · <b style={{ color: COLORS.cream }}>1 pt</b> acertar ganador o empate · <b style={{ color: COLORS.cream }}>0 pts</b> fallar
            </span>
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Tabla en tiempo real</div>
          {LEADERBOARD.map((p, i) => (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 8,
              borderRadius: 12, background: p.name === "Tú" ? COLORS.goldSoft : COLORS.bgCard,
              border: `1px solid ${p.name === "Tú" ? COLORS.gold + "66" : COLORS.line}`,
            }}>
              <div style={{
                width: 24, textAlign: "center", fontFamily: "var(--font-mono), 'Courier New', monospace", fontWeight: 800,
                color: i === 0 ? COLORS.gold : COLORS.creamDim, fontSize: 14,
              }}>{i === 0 ? <Crown size={16} color={COLORS.gold} /> : i + 1}</div>
              <div style={{ fontSize: 20 }}>{p.avatar}</div>
              <div style={{ flex: 1, color: COLORS.cream, fontWeight: p.name === "Tú" ? 800 : 600, fontSize: 13 }}>{p.name}</div>
              <ScoreDigit>{p.pts} pts</ScoreDigit>
            </div>
          ))}
        </div>
      )}

      {tab === "pronosticos" && (
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Registra tu marcador</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11, marginBottom: 14 }}>
            Puedes editar tu pronóstico hasta el silbatazo inicial de cada partido.
          </div>
          {games.map(g => {
            const started = g.live || g.hs !== null;
            const pick = picks[g.id] || { h: 0, a: 0, saved: false };
            return (
              <div key={g.id} style={{
                background: COLORS.bgCard, border: `1px solid ${started ? COLORS.line : (pick.saved ? COLORS.gold + "66" : COLORS.line)}`,
                borderRadius: 12, padding: "12px 14px", marginBottom: 8, opacity: started ? 0.7 : 1,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: COLORS.creamDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{g.league}</span>
                  {started ? (
                    <span style={{ color: g.live ? COLORS.live : COLORS.creamDim, fontSize: 10, fontWeight: 800 }}>
                      {g.live ? "● EN VIVO — cerrado" : "Cerrado"}
                    </span>
                  ) : pick.saved ? (
                    <span style={{ color: COLORS.gold, fontSize: 10, fontWeight: 800 }}>GUARDADO ✓</span>
                  ) : (
                    <span style={{ color: COLORS.creamDim, fontSize: 10 }}>{g.min}</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 12.5, flex: 1 }}>{g.home}</span>
                  {started ? (
                    <ScoreDigit>{g.hs ?? "-"}</ScoreDigit>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => bump(g.id, "h", -1)} style={{
                        width: 24, height: 24, borderRadius: 6, border: `1px solid ${COLORS.line}`,
                        background: COLORS.bg, color: COLORS.creamDim, cursor: "pointer", fontWeight: 800,
                      }}>−</button>
                      <ScoreDigit>{pick.h}</ScoreDigit>
                      <button onClick={() => bump(g.id, "h", 1)} style={{
                        width: 24, height: 24, borderRadius: 6, border: `1px solid ${COLORS.gold}88`,
                        background: COLORS.goldSoft, color: COLORS.gold, cursor: "pointer", fontWeight: 800,
                      }}>+</button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 12.5, flex: 1 }}>{g.away}</span>
                  {started ? (
                    <ScoreDigit>{g.as ?? "-"}</ScoreDigit>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => bump(g.id, "a", -1)} style={{
                        width: 24, height: 24, borderRadius: 6, border: `1px solid ${COLORS.line}`,
                        background: COLORS.bg, color: COLORS.creamDim, cursor: "pointer", fontWeight: 800,
                      }}>−</button>
                      <ScoreDigit>{pick.a}</ScoreDigit>
                      <button onClick={() => bump(g.id, "a", 1)} style={{
                        width: 24, height: 24, borderRadius: 6, border: `1px solid ${COLORS.gold}88`,
                        background: COLORS.goldSoft, color: COLORS.gold, cursor: "pointer", fontWeight: 800,
                      }}>+</button>
                    </div>
                  )}
                </div>

                {!started && !pick.saved && (
                  <button onClick={() => savePick(g.id)} style={{
                    width: "100%", marginTop: 10, background: COLORS.gold, border: "none", borderRadius: 8,
                    padding: "7px 0", color: COLORS.bg, fontWeight: 800, fontSize: 11.5, cursor: "pointer",
                  }}>Guardar pronóstico</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "partidos" && (
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Partidos de la quiniela</div>
          {games.map(g => (
            <div key={g.id} style={{
              background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 12,
              padding: "12px 14px", marginBottom: 8,
            }}>
              <div style={{ color: COLORS.creamDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{g.league}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{g.home}</span>
                <ScoreDigit>{g.hs ?? "-"}</ScoreDigit>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{g.away}</span>
                <ScoreDigit>{g.as ?? "-"}</ScoreDigit>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5, padding: "3px 8px", borderRadius: 999,
                  color: g.live ? COLORS.live : COLORS.creamDim,
                  background: g.live ? `${COLORS.live}22` : "transparent",
                }}>{g.live ? "● EN VIVO " + g.min : g.min}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "chat" && (
        <>
          <div style={{ padding: "12px 16px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {chat.map((c, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: c.me ? "flex-end" : "flex-start" }}>
                {!c.me && (
                  <span onClick={() => setShowReport({ from: c.from })} style={{
                    color: COLORS.creamDim, fontSize: 10, marginBottom: 2, marginLeft: 4, cursor: "pointer",
                  }}>{c.from}</span>
                )}
                <div style={{
                  background: c.me ? COLORS.gold : COLORS.bgCard,
                  color: c.me ? COLORS.bg : COLORS.cream,
                  padding: c.sticker ? "4px 8px" : "8px 12px",
                  borderRadius: 14, fontSize: c.sticker ? 26 : 13, maxWidth: "75%",
                  border: c.me ? "none" : `1px solid ${COLORS.line}`,
                  fontWeight: c.me ? 600 : 500,
                }}>{c.text}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: `1px solid ${COLORS.line}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
              {STICKERS.map(s => (
                <button key={s} onClick={() => setChat([...chat, { from: "Tú", text: s, me: true, sticker: true }])} style={{
                  background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
                  fontSize: 18, padding: "4px 8px", cursor: "pointer", flexShrink: 0,
                }}>{s}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{
                flex: 1, background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 999,
                padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <Smile size={16} color={COLORS.creamDim} />
                <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Manda tu burla..."
                  onKeyDown={e => e.key === "Enter" && send()}
                  style={{ background: "none", border: "none", outline: "none", color: COLORS.cream, fontSize: 13, flex: 1 }} />
              </div>
              <button onClick={send} style={{
                background: COLORS.gold, border: "none", borderRadius: 999, width: 34, height: 34,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}><Send size={15} color={COLORS.bg} /></button>
            </div>
          </div>
        </>
      )}
      {showInvite && <InviteFriendsScreen q={q} onClose={() => setShowInvite(false)} />}
      {showManage && <ManageMembersScreen q={q} onClose={() => setShowManage(false)} />}
      {showReport && <ReportBlockSheet from={showReport.from} onClose={() => setShowReport(null)} />}
    </div>
  );
}

function CreateQuinielaModal({ onClose, onCreated, plan, onOpenPlan }) {
  const [step, setStep] = useState(1); // 1 datos, 2 ligas, 3 partidos, 4 confirmar
  const [name, setName] = useState("");
  const [period, setPeriod] = useState("semana");
  const [chosenLeagues, setChosenLeagues] = useState([]);
  const [activeLeagueId, setActiveLeagueId] = useState(null);
  const [selected, setSelected] = useState([]);

  const limits = PLANS[plan];

  const toggleLeague = (l) => {
    if (l.premium && plan === "free") { onOpenPlan(); return; }
    setChosenLeagues(prev => {
      const has = prev.find(x => x.id === l.id);
      if (has) {
        setSelected(sel => sel.filter(g => g.leagueId !== l.id));
        return prev.filter(x => x.id !== l.id);
      }
      if (prev.length >= limits.maxLeagues) return prev;
      return [...prev, l];
    });
  };

  const toggleGame = (fx, leagueId, leagueName) => {
    setSelected(prev => {
      const has = prev.find(g => g.id === fx.id);
      if (has) return prev.filter(g => g.id !== fx.id);
      if (prev.length >= limits.maxGames) return prev;
      return [...prev, { ...fx, leagueId, leagueName }];
    });
  };

  const sheetHeight = step === 3 ? "80vh" : "auto";
  const activeLeague = chosenLeagues.find(l => l.id === activeLeagueId) || chosenLeagues[0];

  return (
    <div style={{
      position: "absolute", inset: 0, background: "#000000aa", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex",
      alignItems: "flex-end", zIndex: 10,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        ...GLASS, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        width: "100%", padding: 20, borderTop: `1px solid ${COLORS.line}`,
        maxHeight: sheetHeight, display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 16 }}>
            {step === 1 && "Nueva quiniela"}
            {step === 2 && "Elige hasta " + limits.maxLeagues + " ligas"}
            {step === 3 && "Elige los partidos"}
            {step === 4 && "Confirmar"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={COLORS.creamDim} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? COLORS.gold : COLORS.line }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Nombre del grupo</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Quiniela de la Chamba"
              style={{
                width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 10,
                padding: "10px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 16, outline: "none",
              }} />

            <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Duración</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
              {[["semana", "Fin de semana"], ["mes", "Del mes"]].map(([id, label]) => (
                <button key={id} onClick={() => setPeriod(id)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${period === id ? COLORS.gold : COLORS.line}`,
                  background: period === id ? COLORS.goldSoft : "transparent",
                  color: period === id ? COLORS.gold : COLORS.creamDim, fontWeight: 700, fontSize: 12,
                }}>{label}</button>
              ))}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 10, background: COLORS.bg, borderRadius: 10,
              padding: 12, marginBottom: 18, border: `1px solid ${COLORS.line}`,
            }}>
              <PlanBadge plan={plan} />
              <span style={{ color: COLORS.creamDim, fontSize: 11.5 }}>
                Tu plan permite hasta {limits.maxLeagues} ligas y {limits.maxGames} partidos por quiniela.
              </span>
            </div>

            <button onClick={() => setStep(2)} disabled={!name.trim()} style={{
              width: "100%", background: name.trim() ? COLORS.gold : COLORS.line, border: "none", borderRadius: 12, padding: "13px 0",
              color: name.trim() ? COLORS.bg : COLORS.creamDim, fontWeight: 800, fontSize: 14, cursor: name.trim() ? "pointer" : "default",
            }}>Siguiente</button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ color: COLORS.creamDim, fontSize: 12, marginBottom: 14 }}>
              Conectado a las ligas más importantes — elige de cuáles salen los partidos ({chosenLeagues.length}/{limits.maxLeagues}).
            </div>
            <div style={{ overflowY: "auto", flex: 1, marginBottom: 12 }}>
              {LEAGUES.map(l => {
                const isSel = !!chosenLeagues.find(x => x.id === l.id);
                const locked = l.premium && plan === "free";
                const atCap = !isSel && chosenLeagues.length >= limits.maxLeagues;
                return (
                  <button key={l.id} onClick={() => toggleLeague(l)} disabled={atCap && !locked} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                    background: isSel ? COLORS.goldSoft : COLORS.bg,
                    border: `1px solid ${isSel ? COLORS.gold : COLORS.line}`, borderRadius: 12,
                    padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                    opacity: (atCap && !isSel && !locked) ? 0.4 : 1,
                  }}>
                    <span style={{ fontSize: 20 }}>{l.country}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        {l.name}
                        {locked && <span style={{
                          fontSize: 9, background: COLORS.gold, color: COLORS.bg, padding: "2px 6px",
                          borderRadius: 999, fontWeight: 800, display: "flex", alignItems: "center", gap: 3,
                        }}><Crown size={9} /> PREMIUM</span>}
                      </div>
                      <div style={{ color: COLORS.creamDim, fontSize: 11 }}>{l.fixtures.length} partidos disponibles</div>
                    </div>
                    {isSel ? <span style={{ color: COLORS.gold, fontSize: 16 }}>✓</span> : <ChevronRight size={16} color={COLORS.creamDim} />}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{
                padding: "13px 16px", borderRadius: 12, background: "transparent",
                border: `1px solid ${COLORS.line}`, color: COLORS.creamDim, fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>Atrás</button>
              <button onClick={() => { setActiveLeagueId(chosenLeagues[0]?.id); setStep(3); }} disabled={chosenLeagues.length === 0} style={{
                flex: 1, background: chosenLeagues.length ? COLORS.gold : COLORS.line, border: "none", borderRadius: 12,
                color: chosenLeagues.length ? COLORS.bg : COLORS.creamDim, fontWeight: 800, fontSize: 13,
                cursor: chosenLeagues.length ? "pointer" : "default",
              }}>Siguiente</button>
            </div>
          </>
        )}

        {step === 3 && activeLeague && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
              {chosenLeagues.map(l => (
                <button key={l.id} onClick={() => setActiveLeagueId(l.id)} style={{
                  flexShrink: 0, padding: "7px 12px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: activeLeague.id === l.id ? COLORS.gold : COLORS.bg,
                  color: activeLeague.id === l.id ? COLORS.bg : COLORS.creamDim, fontWeight: 700, fontSize: 11.5,
                }}>{l.country} {l.name}</button>
              ))}
            </div>
            <div style={{
              color: selected.length >= limits.maxGames ? COLORS.live : COLORS.creamDim,
              fontSize: 11, marginBottom: 10, fontWeight: 600,
            }}>
              {selected.length}/{limits.maxGames} partidos elegidos
              {selected.length >= limits.maxGames && plan === "free" && " · hazte Premium para agregar hasta 20"}
            </div>
            <div style={{ overflowY: "auto", flex: 1, marginBottom: 12 }}>
              {activeLeague.fixtures.map(fx => {
                const isSel = !!selected.find(g => g.id === fx.id);
                const finished = fx.status === "final";
                const atCap = !isSel && selected.length >= limits.maxGames;
                return (
                  <button key={fx.id} disabled={finished || atCap} onClick={() => toggleGame(fx, activeLeague.id, activeLeague.name)} style={{
                    width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                    background: isSel ? COLORS.goldSoft : COLORS.bg,
                    border: `1px solid ${isSel ? COLORS.gold : COLORS.line}`,
                    borderRadius: 12, padding: "11px 12px", marginBottom: 8,
                    cursor: (finished || atCap) ? "default" : "pointer", opacity: (finished || atCap) ? 0.4 : 1,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `1.5px solid ${isSel ? COLORS.gold : COLORS.creamDim}`,
                      background: isSel ? COLORS.gold : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.bg, fontSize: 12, fontWeight: 900,
                    }}>{isSel ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: COLORS.cream, fontSize: 12.5, fontWeight: 600 }}>{fx.home} vs {fx.away}</div>
                      <div style={{ color: COLORS.creamDim, fontSize: 10.5, marginTop: 2 }}>
                        {finished ? `Resultado final: ${fx.hs}-${fx.as}` : fx.date}
                        {!finished && fx.fav && ` · favorito ${fx.fav} (${fx.favPct}%)`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(2)} style={{
                padding: "13px 16px", borderRadius: 12, background: "transparent",
                border: `1px solid ${COLORS.line}`, color: COLORS.creamDim, fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>Atrás</button>
              <button onClick={() => setStep(4)} disabled={selected.length === 0} style={{
                flex: 1, background: selected.length ? COLORS.gold : COLORS.line, border: "none", borderRadius: 12,
                color: selected.length ? COLORS.bg : COLORS.creamDim, fontWeight: 800, fontSize: 13,
                cursor: selected.length ? "pointer" : "default",
              }}>Continuar {selected.length > 0 ? `(${selected.length})` : ""}</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, background: COLORS.bg, borderRadius: 10,
              padding: 12, marginBottom: 12, border: `1px solid ${COLORS.line}`,
            }}>
              <Shield size={16} color={COLORS.gold} />
              <span style={{ color: COLORS.creamDim, fontSize: 12 }}>Serás el admin: puedes editar los partidos e invitar hasta 15 amigos después de crear.</span>
            </div>
            <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              {selected.length} partidos de {chosenLeagues.length} ligas
            </div>
            <div style={{ marginBottom: 16, maxHeight: 160, overflowY: "auto" }}>
              {selected.map(fx => (
                <div key={fx.id} style={{
                  display: "flex", justifyContent: "space-between", color: COLORS.cream, fontSize: 12,
                  padding: "6px 0", borderBottom: `1px solid ${COLORS.line}`,
                }}>
                  <span>{fx.home} vs {fx.away}</span>
                  <span style={{ color: COLORS.creamDim, fontSize: 10.5 }}>{fx.leagueName}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onCreated({
              name, emoji: "🏆", members: 1, max: 15, id: Date.now(),
              games: selected.map(fx => ({
                id: fx.id, home: fx.home, away: fx.away,
                hs: fx.status === "final" ? fx.hs : null, as: fx.status === "final" ? fx.as : null,
                min: fx.date, live: false, league: fx.leagueName,
              })),
            })} style={{
              width: "100%", background: COLORS.gold, border: "none", borderRadius: 12, padding: "13px 0",
              color: COLORS.bg, fontWeight: 800, fontSize: 14, cursor: "pointer",
            }}>
              Crear "{name}"
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ plan, onOpenPlan, onOpenHistory, onOpenSettings, onOpenAdvertise }) {
  return (
    <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: COLORS.bgCard,
          border: `2px solid ${COLORS.gold}`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 28,
        }}>🦁</div>
        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 16, marginTop: 10 }}>Rodrigo</div>
        <button onClick={onOpenPlan} style={{ background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
          <PlanBadge plan={plan} />
        </button>
      </div>
      <button onClick={onOpenPlan} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.goldSoft,
        border: `1px solid ${COLORS.gold}55`, borderRadius: 12, padding: "13px 14px", marginBottom: 8, cursor: "pointer",
      }}>
        <Crown size={17} color={COLORS.gold} />
        <span style={{ color: COLORS.cream, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "left" }}>Mi plan y suscripción</span>
        <ChevronRight size={16} color={COLORS.creamDim} />
      </button>
      {[["Historial de quinielas", Trophy, onOpenHistory], ["Amigos", Users, null], ["Anúnciate con nosotros", Megaphone, onOpenAdvertise], ["Ajustes", Settings, onOpenSettings]].map(([label, Icon, action]) => (
        <button key={label} onClick={action || undefined} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
          border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 8,
          cursor: action ? "pointer" : "default", textAlign: "left",
        }}>
          <Icon size={17} color={COLORS.gold} />
          <span style={{ color: COLORS.cream, fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>
          <ChevronRight size={16} color={COLORS.creamDim} />
        </button>
      ))}
    </div>
  );
}

function NotificationsScreen({ onClose }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Notificaciones</span>
      </div>
      {NOTIFICATIONS.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <Inbox size={30} color={COLORS.creamDim} style={{ marginBottom: 10 }} />
          <div style={{ color: COLORS.creamDim, fontSize: 12.5 }}>No tienes notificaciones</div>
        </div>
      ) : (
        <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
          {NOTIFICATIONS.map(n => (
            <div key={n.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: n.unread ? COLORS.goldSoft : COLORS.bgCard,
              border: `1px solid ${n.unread ? COLORS.gold + "44" : COLORS.line}`,
              borderRadius: 12, padding: "12px 14px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 18 }}>{n.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.cream, fontSize: 12.5, fontWeight: n.unread ? 700 : 500, lineHeight: 1.4 }}>{n.title}</div>
                <div style={{ color: COLORS.creamDim, fontSize: 10.5, marginTop: 4 }}>{n.time}</div>
              </div>
              {n.unread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.gold, flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsScreen({ onClose, plan, onDowngrade, onLogout, onDeleteAccount }) {
  const [name, setName] = useState("Rodrigo");
  const [avatar, setAvatar] = useState("🦁");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0 | 1 | 2
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const AVATARS = ["🦁", "🦊", "🐯", "🐼", "🐨", "🐺", "🐵", "🦉"];

  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Ajustes de cuenta</span>
      </div>

      <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: COLORS.bgCard,
            border: `2px solid ${COLORS.gold}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 28, marginBottom: 10,
          }}>{avatar}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => setAvatar(a)} style={{
                width: 30, height: 30, borderRadius: "50%", fontSize: 15, cursor: "pointer",
                background: a === avatar ? COLORS.goldSoft : COLORS.bgCard,
                border: `1.5px solid ${a === avatar ? COLORS.gold : COLORS.line}`,
              }}>{a}</button>
            ))}
          </div>
        </div>

        <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Nombre</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{
          width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
          padding: "10px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 20, outline: "none",
        }} />

        <button style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
          border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 8, cursor: "pointer",
        }}>
          <span style={{ color: COLORS.cream, fontSize: 13, fontWeight: 600, flex: 1, textAlign: "left" }}>Aviso de privacidad</span>
          <ChevronRight size={16} color={COLORS.creamDim} />
        </button>
        <button style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
          border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 20, cursor: "pointer",
        }}>
          <span style={{ color: COLORS.cream, fontSize: 13, fontWeight: 600, flex: 1, textAlign: "left" }}>Términos de uso</span>
          <ChevronRight size={16} color={COLORS.creamDim} />
        </button>

        {plan === "premium" && (
          confirmCancel ? (
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ color: COLORS.cream, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
                Tu suscripción la administra App Store / Google Play, no Quinielapp — te vamos a llevar a los ajustes de suscripciones de tu teléfono para cancelarla ahí.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { onDowngrade(); setConfirmCancel(false); }} style={{
                  flex: 1, background: COLORS.gold, border: "none", borderRadius: 10, padding: "9px 0",
                  color: COLORS.bg, fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>Ir a ajustes de suscripción</button>
                <button onClick={() => setConfirmCancel(false)} style={{
                  flex: 1, background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "9px 0",
                  color: COLORS.creamDim, fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>Cerrar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(true)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
              border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10, cursor: "pointer",
            }}>
              <Crown size={17} color={COLORS.creamDim} />
              <span style={{ color: COLORS.cream, fontSize: 13, fontWeight: 600, flex: 1, textAlign: "left" }}>Gestionar suscripción Premium</span>
            </button>
          )
        )}

        {confirmLogout ? (
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: COLORS.cream, fontSize: 12.5, marginBottom: 10 }}>¿Seguro que quieres cerrar sesión?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onLogout} style={{
                flex: 1, background: COLORS.live, border: "none", borderRadius: 10, padding: "9px 0",
                color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>Cerrar sesión</button>
              <button onClick={() => setConfirmLogout(false)} style={{
                flex: 1, background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "9px 0",
                color: COLORS.creamDim, fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmLogout(true)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
            border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10, cursor: "pointer",
          }}>
            <LogOut size={17} color={COLORS.live} />
            <span style={{ color: COLORS.live, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "left" }}>Cerrar sesión</span>
          </button>
        )}

        <div style={{ height: 1, background: COLORS.line, margin: "18px 0 14px" }} />

        {deleteStep === 0 && (
          <button onClick={() => setDeleteStep(1)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12, background: "transparent",
            border: `1px solid ${COLORS.live}55`, borderRadius: 12, padding: "13px 14px", cursor: "pointer",
          }}>
            <Trash2 size={17} color={COLORS.live} />
            <span style={{ color: COLORS.live, fontSize: 13, fontWeight: 700, flex: 1, textAlign: "left" }}>Eliminar mi cuenta</span>
          </button>
        )}

        {deleteStep === 1 && (
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.live}55`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: COLORS.cream, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
              Esto borra tu cuenta y tu historial de forma permanente: perfil, quinielas creadas, pronósticos, historial y tu lugar en el ranking. No se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteStep(2)} style={{
                flex: 1, background: COLORS.live, border: "none", borderRadius: 10, padding: "9px 0",
                color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>Entiendo, continuar</button>
              <button onClick={() => setDeleteStep(0)} style={{
                flex: 1, background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "9px 0",
                color: COLORS.creamDim, fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>Cancelar</button>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.live}55`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: COLORS.cream, fontSize: 12.5, marginBottom: 10 }}>
              Escribe <b>ELIMINAR</b> para confirmar.
            </div>
            <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="ELIMINAR" style={{
              width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.line}`, borderRadius: 10,
              padding: "9px 12px", color: COLORS.cream, fontSize: 13, marginBottom: 10, outline: "none",
            }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onDeleteAccount} disabled={deleteConfirmText !== "ELIMINAR"} style={{
                flex: 1, background: deleteConfirmText === "ELIMINAR" ? COLORS.live : COLORS.line, border: "none", borderRadius: 10, padding: "9px 0",
                color: deleteConfirmText === "ELIMINAR" ? "#fff" : COLORS.creamDim, fontWeight: 700, fontSize: 12,
                cursor: deleteConfirmText === "ELIMINAR" ? "pointer" : "default",
              }}>Eliminar cuenta</button>
              <button onClick={() => { setDeleteStep(0); setDeleteConfirmText(""); }} style={{
                flex: 1, background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "9px 0",
                color: COLORS.creamDim, fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdvertiseScreen({ onClose }) {
  const [sent, setSent] = useState(false);
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");

  const placements = [
    { key: "home_banner", name: "Banner de Inicio", size: "320×100", where: "Entre tu tablero y la lista de tus quinielas — lo primero que ve cada usuario al abrir la app." },
    { key: "ranking_banner", name: "Banner de Ranking", size: "320×100", where: "Debajo de la Quiniela Global, antes de la tabla de posiciones — audiencia de usuarios competitivos y muy activos." },
    { key: "desktop_sidebar", name: "Rectángulo de escritorio", size: "300×250", where: "Panel lateral fijo del dashboard de escritorio, junto a las estadísticas del usuario. El formato más vendido de la industria." },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 15 }}>Anúnciate con nosotros</span>
      </div>

      <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Megaphone size={22} color={COLORS.gold} />
          <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 16 }}>Llega a la comunidad de Quinielapp</div>
        </div>
        <p style={{ color: COLORS.creamDim, fontSize: 12.5, lineHeight: 1.6, marginBottom: 22 }}>
          Usuarios que revisan resultados varias veces por semana, dentro de sus propias quinielas con amigos y en la Quiniela Global. Estos son los espacios disponibles hoy:
        </p>

        {placements.map(p => (
          <div key={p.key} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13.5 }}>{p.name}</span>
              <span style={{ color: COLORS.gold, fontSize: 11, fontFamily: "var(--font-mono), monospace", fontWeight: 700 }}>{p.size}</span>
            </div>
            <div style={{ color: COLORS.creamDim, fontSize: 11.5, lineHeight: 1.5 }}>{p.where}</div>
          </div>
        ))}

        <div style={{ height: 1, background: COLORS.line, margin: "20px 0" }} />

        {sent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 14 }}>¡Gracias, {company}!</div>
            <div style={{ color: COLORS.creamDim, fontSize: 12, marginTop: 6 }}>Te contactamos a {email} para armar tu campaña.</div>
          </div>
        ) : (
          <>
            <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>¿Te interesa? Déjanos tus datos</div>
            <label style={{ color: COLORS.creamDim, fontSize: 11 }}>Empresa o marca</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nombre de tu empresa" style={{
              width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
              padding: "10px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 14, outline: "none",
            }} />
            <label style={{ color: COLORS.creamDim, fontSize: 11 }}>Correo de contacto</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="tu@empresa.com" style={{
              width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
              padding: "10px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 18, outline: "none",
            }} />
            <button onClick={() => company.trim() && email.trim() && setSent(true)} disabled={!company.trim() || !email.trim()} style={{
              width: "100%", background: (company.trim() && email.trim()) ? COLORS.gold : COLORS.line, border: "none",
              borderRadius: 12, padding: "13px 0", color: (company.trim() && email.trim()) ? COLORS.bg : COLORS.creamDim,
              fontWeight: 700, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Mail size={15} /> Solicitar información
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HistoryScreen({ onClose }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Historial de quinielas</span>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {PAST_QUINIELAS.map(q => (
          <div key={q.id} style={{
            background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 14,
            padding: 14, marginBottom: 10,
          }}>
            <button onClick={() => setOpen(open === q.id ? null : q.id)} style={{
              width: "100%", background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 20 }}>{q.emoji}</div>
                <div>
                  <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13.5 }}>{q.name}</div>
                  <div style={{ color: COLORS.creamDim, fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Crown size={11} color={COLORS.gold} /> Ganó {q.winner.name} · {q.winner.pts} pts
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color={COLORS.creamDim} style={{ transform: open === q.id ? "rotate(90deg)" : "none" }} />
            </button>
            {open === q.id && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.line}`, paddingTop: 10 }}>
                {q.table.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                    <span style={{ color: COLORS.creamDim, fontSize: 11, width: 14 }}>{i + 1}</span>
                    <span style={{ fontSize: 15 }}>{p.avatar}</span>
                    <span style={{ color: COLORS.cream, fontSize: 12, flex: 1 }}>{p.name}</span>
                    <ScoreDigit>{p.pts} pts</ScoreDigit>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FacebookIcon({ size = 16, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
    </svg>
  );
}

// Símbolo de marca de Quinielapp: un boleto en miniatura con sus casillas L/E/V
// (homenaje a la boleta clásica de Progol) — reemplaza el trofeo genérico en
// todos los lugares donde antes iba como logo de la marca (login, sidebar).
// El trofeo se queda donde de verdad significa "trofeo/ganador" (tarjetas de
// puntos, tab de Quinielas), esto es solo la marca.
// Tamaños estándar de la industria por placement — ver README sección
// "Publicidad" para el detalle completo que le compartirías a un anunciante.
const AD_SPECS = {
  home_banner: { w: 320, h: 100, label: "320×100" },
  ranking_banner: { w: 320, h: 100, label: "320×100" },
  desktop_sidebar: { w: 300, h: 250, label: "300×250" },
};

// Espacio publicitario. Sin anuncio configurado en /api/ads: se ve como
// placeholder con el tamaño esperado, para que cualquiera (tú, un inversionista,
// un anunciante) entienda exactamente qué se está vendiendo y dónde vive.
// Con un anuncio activo: lo muestra tal cual y registra impresión/clic.
function AdBanner({ placement }) {
  const [ad, setAd] = useState(undefined); // undefined = cargando, null = sin anuncio
  const spec = AD_SPECS[placement] || { w: 320, h: 100, label: "" };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads?placement=${placement}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAd(data.ad || null);
        if (data.ad) {
          fetch("/api/ads/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ad_id: data.ad.id, type: "impression" }),
          }).catch(() => {});
        }
      })
      .catch(() => { if (!cancelled) setAd(null); });
    return () => { cancelled = true; };
  }, [placement]);

  const handleClick = () => {
    if (!ad) return;
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: ad.id, type: "click" }),
    }).catch(() => {});
  };

  if (ad) {
    return (
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer sponsored" onClick={handleClick} style={{
        display: "block", width: "100%", maxWidth: spec.w, margin: "0 auto 20px", borderRadius: 12,
        overflow: "hidden", border: `1px solid ${COLORS.line}`,
      }}>
        <img src={ad.image_url} alt={ad.advertiser} style={{ width: "100%", height: "auto", display: "block" }} />
      </a>
    );
  }

  return (
    <div style={{
      width: "100%", maxWidth: spec.w, aspectRatio: `${spec.w} / ${spec.h}`, margin: "0 auto 20px",
      border: `1.5px dashed ${COLORS.line}`, borderRadius: 12, background: COLORS.bgCard,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
    }}>
      <span style={{ color: COLORS.creamDim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Espacio publicitario
      </span>
      <span style={{ color: COLORS.creamDim, fontSize: 9, fontFamily: "var(--font-mono), 'Courier New', monospace", opacity: 0.6 }}>
        {spec.label} · {placement}
      </span>
    </div>
  );
}

function TicketLogo({ size = 28, color = COLORS.gold }) {
  const s = size / 46; // el diseño original se hizo a 46px de alto
  return (
    <svg width={size * (34 / 46)} height={size} viewBox="0 0 34 46">
      <rect x="0.9" y="0.9" width="32.2" height="44.2" rx="4" fill="none" stroke={color} strokeWidth={1.8} />
      <line x1="0.9" y1="11" x2="33.1" y2="11" stroke={color} strokeWidth={1.4} />
      <g stroke={color} strokeWidth={1.1} fill="none">
        <rect x="10" y="15" width="5" height="5" rx="1" /><rect x="17" y="15" width="5" height="5" rx="1" /><rect x="24" y="15" width="5" height="5" rx="1" />
        <rect x="10" y="23" width="5" height="5" rx="1" /><rect x="17" y="23" width="5" height="5" rx="1" /><rect x="24" y="23" width="5" height="5" rx="1" />
        <rect x="10" y="31" width="5" height="5" rx="1" /><rect x="17" y="31" width="5" height="5" rx="1" /><rect x="24" y="31" width="5" height="5" rx="1" />
      </g>
      <rect x="10" y="15" width="5" height="5" rx="1" fill={color} />
      <rect x="24" y="23" width="5" height="5" rx="1" fill={color} />
      <rect x="17" y="31" width="5" height="5" rx="1" fill={color} />
    </svg>
  );
}

function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.45c-.28 1.5-1.13 2.77-2.4 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.73z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.1-6.71-4.93H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.31c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.66H1.29A11.96 11.96 0 000 12.03c0 1.93.46 3.76 1.29 5.37l4-3.09z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.66l4 3.09c.94-2.83 3.59-4.98 6.71-4.98z" />
    </svg>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devLoadingEmail, setDevLoadingEmail] = useState(null);

  // Acceso directo con las cuentas de prueba de authOptions.js (DEV_USERS).
  // Solo tienen efecto mientras no exista DATABASE_URL — en cuanto la
  // configures, estas cuentas dejan de funcionar automáticamente.
  const devLogin = async (devEmail, devPassword) => {
    setError("");
    setDevLoadingEmail(devEmail);
    const result = await signIn("credentials", { email: devEmail, password: devPassword, redirect: false });
    if (result?.error) setError("Las cuentas de prueba se desactivaron: ya hay una base de datos real conectada.");
    setDevLoadingEmail(null);
  };

  const canSubmit = mode === "login"
    ? email.trim() && pass.trim()
    : name.trim() && email.trim() && birthdate.trim() && pass.trim();

  // Registro: crea la fila en Neon (/api/users, bcrypt del lado del servidor) y
  // luego inicia sesión con las mismas credenciales. Login: entra directo.
  // En ambos casos, quien detecta que ya quedaste autenticado es el hook
  // useSession() de arriba (MiQuinielaApp) — no navegamos nada a mano aquí.
  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, birthdate, password: pass }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error || "No se pudo crear la cuenta.");
          setLoading(false);
          return;
        }
      }
      const result = await signIn("credentials", { email, password: pass, redirect: false });
      if (result?.error) setError("Correo o contraseña incorrectos.");
    } catch (e) {
      setError("Algo salió mal. Intenta de nuevo.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 24px 32px", justifyContent: "space-between", overflowY: "auto" }}>
      <div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: COLORS.goldSoft, border: `1.5px solid ${COLORS.gold}`,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
          }}>
            <TicketLogo size={30} />
          </div>
          <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 20, letterSpacing: -0.3 }}>Quinielapp</div>
          <div style={{ color: COLORS.creamDim, fontSize: 12, marginTop: 4 }}>Arma la quiniela con tu banda</div>
        </div>

        <div style={{
          background: COLORS.goldSoft, border: `1px dashed ${COLORS.gold}88`, borderRadius: 12,
          padding: 14, marginBottom: 20,
        }}>
          <div style={{ color: COLORS.gold, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Modo de pruebas — sin base de datos
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => devLogin("demo@quinielapp.com", "demo1234")} disabled={!!devLoadingEmail} style={{
              width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.gold}`, borderRadius: 10,
              padding: "10px 12px", color: COLORS.cream, fontWeight: 700, fontSize: 12.5, cursor: "pointer", textAlign: "left",
            }}>
              {devLoadingEmail === "demo@quinielapp.com" ? "Entrando..." : "Entrar como Demo Rodrigo"}
            </button>
            <button onClick={() => devLogin("admin@quinielapp.com", "admin1234")} disabled={!!devLoadingEmail} style={{
              width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.gold}`, borderRadius: 10,
              padding: "10px 12px", color: COLORS.cream, fontWeight: 700, fontSize: 12.5, cursor: "pointer", textAlign: "left",
            }}>
              {devLoadingEmail === "admin@quinielapp.com" ? "Entrando..." : "Entrar como Demo Admin"}
            </button>
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 9.5, marginTop: 10, lineHeight: 1.5 }}>
            demo@quinielapp.com / demo1234 · admin@quinielapp.com / admin1234 — se desactivan solas en cuanto conectes Neon de verdad.
          </div>
        </div>

        <button onClick={() => signIn("facebook")} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: "#1877F2", border: "none", borderRadius: 12, padding: "13px 0",
          color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginBottom: 10,
        }}>
          <FacebookIcon size={16} /> Continuar con Facebook
        </button>
        <button onClick={() => signIn("google")} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 0",
          color: "#1f1f1f", fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginBottom: 10,
        }}>
          <GoogleIcon size={16} /> Continuar con Google
        </button>
        <div style={{ color: COLORS.creamDim, fontSize: 10.5, textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
          Con Facebook además te ayudamos a encontrar amigos tuyos que ya están en Quinielapp
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: COLORS.line }} />
          <span style={{ color: COLORS.creamDim, fontSize: 11 }}>o con tu correo</span>
          <div style={{ flex: 1, height: 1, background: COLORS.line }} />
        </div>

        {mode === "signup" && (
          <>
            <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" type="text"
              style={{
                width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
                padding: "11px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 14, outline: "none",
              }} />
          </>
        )}

        <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Correo</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" type="email"
          style={{
            width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
            padding: "11px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 14, outline: "none",
          }} />

        {mode === "signup" && (
          <>
            <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Fecha de nacimiento</label>
            <input value={birthdate} onChange={e => setBirthdate(e.target.value)} type="date"
              style={{
                width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
                padding: "11px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: 14, outline: "none",
                colorScheme: "dark",
              }} />
          </>
        )}

        <label style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Contraseña</label>
        <input value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" type="password"
          style={{
            width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 10,
            padding: "11px 12px", color: COLORS.cream, fontSize: 13, marginTop: 6, marginBottom: mode === "login" ? 8 : 14, outline: "none",
          }} />

        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 18 }}>
            <span style={{ color: COLORS.gold, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>¿Olvidaste tu contraseña?</span>
          </div>
        )}

        {error && (
          <div style={{ color: COLORS.live, fontSize: 11.5, marginBottom: 10, textAlign: "center" }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={!canSubmit || loading} style={{
          width: "100%", background: (canSubmit && !loading) ? COLORS.gold : COLORS.line, border: "none",
          borderRadius: 12, padding: "13px 0", color: (canSubmit && !loading) ? COLORS.bg : COLORS.creamDim,
          fontWeight: 800, fontSize: 14, cursor: "pointer",
        }}>
          {loading ? "Un momento..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </div>

      <div style={{ textAlign: "center", color: COLORS.creamDim, fontSize: 12.5, marginTop: 16 }}>
        {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
        <span onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: COLORS.gold, fontWeight: 700, cursor: "pointer" }}>
          {mode === "login" ? "Regístrate" : "Inicia sesión"}
        </span>
      </div>

      {mode === "signup" && (
        <div style={{ textAlign: "center", color: COLORS.creamDim, fontSize: 10, marginTop: 12, lineHeight: 1.6 }}>
          Al crear tu cuenta aceptas los <span style={{ color: COLORS.gold, textDecoration: "underline", cursor: "pointer" }}>Términos de uso</span> y el <span style={{ color: COLORS.gold, textDecoration: "underline", cursor: "pointer" }}>Aviso de privacidad</span> de Quinielapp.
        </div>
      )}
    </div>
  );
}

function PlanScreen({ plan, onClose, onUpgrade }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div style={{
        position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
        display: "flex", flexDirection: "column", padding: "22px 20px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <button onClick={() => setConfirming(false)} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
          <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Confirmar suscripción</span>
          <div style={{ width: 18 }} />
        </div>

        {/* Compra gestionada por la tienda (App Store / Google Play) — Quinielapp nunca
            recibe ni procesa datos de tarjeta. El cobro, la renovación y la cancelación
            los maneja el sistema operativo, como exige Apple/Google para suscripciones digitales. */}
        <div style={{
          background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 14,
          padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: COLORS.goldSoft,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}><Crown size={18} color={COLORS.gold} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 12.5 }}>Quinielapp Premium</div>
            <div style={{ color: COLORS.creamDim, fontSize: 11, marginTop: 2 }}>$1.00 USD / mes · se renueva automático</div>
          </div>
        </div>

        <div style={{ color: COLORS.creamDim, fontSize: 11, lineHeight: 1.6, marginBottom: 20 }}>
          Se cobrará a tu método de pago de App Store / Google Play. La suscripción se renueva
          a menos que la canceles al menos 24 horas antes de que termine el periodo actual,
          desde los ajustes de tu cuenta de Apple o Google — no desde Quinielapp.
        </div>

        <button onClick={onUpgrade} style={{
          width: "100%", background: COLORS.gold, border: "none", borderRadius: 12, padding: "14px 0",
          color: COLORS.bg, fontWeight: 800, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <Shield size={15} /> Confirmar con Face ID / huella
        </button>
        <div style={{ color: COLORS.creamDim, fontSize: 10.5, textAlign: "center", marginTop: 10 }}>
          Cancela cuando quieras desde Ajustes de tu teléfono. Sin compromiso de permanencia.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column", padding: "22px 20px 24px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Mi plan</span>
        <div style={{ width: 18 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{
          border: `1.5px solid ${plan === "free" ? COLORS.line : COLORS.gold}`,
          background: plan === "free" ? COLORS.bgCard : COLORS.goldSoft,
          borderRadius: 16, padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Gratis</span>
            {plan === "free" && <span style={{ color: COLORS.gold, fontSize: 11, fontWeight: 800 }}>PLAN ACTUAL</span>}
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 12.5, lineHeight: 1.9 }}>
            · Hasta {PLANS.free.maxLeagues} ligas por quiniela<br />
            · Hasta {PLANS.free.maxGames} partidos por quiniela<br />
            · Marcador en tiempo real y chat con stickers
          </div>
        </div>

        <div style={{
          border: `1.5px solid ${COLORS.gold}`, background: COLORS.goldSoft,
          borderRadius: 16, padding: 18, marginBottom: 14, position: "relative", overflow: "hidden",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
              <Crown size={16} color={COLORS.gold} /> Premium
            </span>
            {plan === "premium" ? (
              <span style={{ color: COLORS.gold, fontSize: 11, fontWeight: 800 }}>PLAN ACTUAL</span>
            ) : (
              <span style={{ color: COLORS.gold, fontWeight: 800, fontSize: 15 }}>$1<span style={{ fontSize: 11, fontWeight: 600 }}>/mes</span></span>
            )}
          </div>
          <div style={{ color: COLORS.creamDim, fontSize: 12.5, lineHeight: 1.9 }}>
            · Hasta {PLANS.premium.maxLeagues} ligas por quiniela<br />
            · Hasta {PLANS.premium.maxGames} partidos por quiniela<br />
            · Incluye Ligue 1, MLS y más ligas exclusivas
          </div>
        </div>
      </div>

      {plan === "free" ? (
        <button onClick={() => setConfirming(true)} style={{
          width: "100%", background: COLORS.gold, border: "none", borderRadius: 12, padding: "14px 0",
          color: COLORS.bg, fontWeight: 800, fontSize: 14, cursor: "pointer",
        }}>Hacerme Premium · $1/mes</button>
      ) : (
        <div style={{ textAlign: "center", color: COLORS.creamDim, fontSize: 11.5 }}>
          Ya eres Premium — cancela cuando quieras desde Ajustes.
        </div>
      )}
    </div>
  );
}

function FriendsFoundScreen({ onContinue }) {
  const found = [
    { name: "Karla Ramírez", mutual: 3, avatar: "🦊" },
    { name: "Diego Salas", mutual: 5, avatar: "🐯" },
    { name: "Memo Torres", mutual: 2, avatar: "🐼" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "40px 20px 28px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", background: "#1877F222", border: "1.5px solid #1877F2",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
        }}>
          <FacebookIcon size={22} color="#1877F2" />
        </div>
        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 17, textAlign: "center" }}>¡Encontramos a tus amigos!</div>
        <div style={{ color: COLORS.creamDim, fontSize: 12, marginTop: 4, textAlign: "center" }}>
          {found.length} de tus amigos de Facebook ya usan Quinielapp
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {found.map(f => (
          <div key={f.name} style={{
            display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
            border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8,
          }}>
            <div style={{ fontSize: 22 }}>{f.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{f.name}</div>
              <div style={{ color: COLORS.creamDim, fontSize: 11 }}>{f.mutual} amigos en común</div>
            </div>
            <button style={{
              background: COLORS.goldSoft, border: `1px solid ${COLORS.gold}66`, borderRadius: 999,
              padding: "6px 12px", color: COLORS.gold, fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>Seguir</button>
          </div>
        ))}
      </div>

      <button onClick={onContinue} style={{
        width: "100%", background: COLORS.gold, border: "none", borderRadius: 12, padding: "13px 0",
        color: COLORS.bg, fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 12,
      }}>Continuar</button>
    </div>
  );
}


function ManageMembersScreen({ q, onClose }) {
  const [members, setMembers] = useState([
    { name: "Tú", avatar: "🦁", role: "admin" },
    { name: "Karla Ramírez", avatar: "🦊", role: "member" },
    { name: "Diego Salas", avatar: "🐯", role: "member" },
    { name: "Memo Torres", avatar: "🐼", role: "member" },
    { name: "Ana Beltrán", avatar: "🐨", role: "member" },
  ]);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const remove = (name) => {
    setMembers(prev => prev.filter(m => m.name !== name));
    setConfirmRemove(null);
  };

  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
        <div>
          <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Miembros del grupo</div>
          <div style={{ color: COLORS.creamDim, fontSize: 11 }}>{members.length}/{q.max} · solo el admin puede quitar gente</div>
        </div>
      </div>

      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {members.map(m => (
          <div key={m.name} style={{
            display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
            border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8,
          }}>
            <div style={{ fontSize: 22 }}>{m.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{m.name}</div>
              {m.role === "admin" && (
                <div style={{ color: COLORS.gold, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                  <Shield size={10} /> Admin del grupo
                </div>
              )}
            </div>
            {m.role !== "admin" && (
              confirmRemove === m.name ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => remove(m.name)} style={{
                    background: COLORS.live, border: "none", borderRadius: 999, padding: "6px 10px",
                    color: "#fff", fontWeight: 800, fontSize: 10.5, cursor: "pointer",
                  }}>Confirmar</button>
                  <button onClick={() => setConfirmRemove(null)} style={{
                    background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "6px 10px",
                    color: COLORS.creamDim, fontWeight: 700, fontSize: 10.5, cursor: "pointer",
                  }}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(m.name)} style={{
                  background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "6px 12px",
                  color: COLORS.creamDim, fontWeight: 700, fontSize: 11, cursor: "pointer",
                }}>Quitar</button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


function InviteFriendsScreen({ q, onClose }) {
  const [tab, setTab] = useState("facebook"); // facebook | link | contacts
  const [invited, setInvited] = useState([]);
  const [copied, setCopied] = useState(false);

  const fbFriends = [
    { name: "Karla Ramírez", avatar: "🦊", inApp: true },
    { name: "Diego Salas", avatar: "🐯", inApp: true },
    { name: "Memo Torres", avatar: "🐼", inApp: true },
    { name: "Ana Beltrán", avatar: "🐨", inApp: false },
    { name: "Luis Vega", avatar: "🐺", inApp: false },
  ];

  const toggleInvite = (name) => {
    setInvited(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const link = `miquiniela.app/j/${q ? q.id : "xyz"}`;
  const slots = q ? q.max - q.members : 15;

  return (
    <div style={{
      position: "absolute", inset: 0, background: COLORS.bg, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.creamDim, cursor: "pointer", fontSize: 18 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15 }}>Invitar amigos</div>
            <div style={{ color: COLORS.creamDim, fontSize: 11 }}>{slots} lugares disponibles en {q ? q.name : "tu quiniela"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[["facebook", "Facebook"], ["link", "Link"], ["contacts", "Contactos"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === id ? COLORS.gold : COLORS.bgCard,
              color: tab === id ? COLORS.bg : COLORS.creamDim, fontWeight: 700, fontSize: 12,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "facebook" && (
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Tus amigos de Facebook
          </div>
          {fbFriends.map(f => {
            const isIn = invited.includes(f.name);
            return (
              <div key={f.name} style={{
                display: "flex", alignItems: "center", gap: 12, background: COLORS.bgCard,
                border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8,
              }}>
                <div style={{ fontSize: 22 }}>{f.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 13 }}>{f.name}</div>
                  <div style={{ color: f.inApp ? COLORS.teal : COLORS.creamDim, fontSize: 10.5, marginTop: 2 }}>
                    {f.inApp ? "Ya usa Quinielapp" : "Aún no tiene la app"}
                  </div>
                </div>
                <button onClick={() => toggleInvite(f.name)} style={{
                  background: isIn ? COLORS.gold : COLORS.goldSoft,
                  border: `1px solid ${COLORS.gold}${isIn ? "" : "66"}`, borderRadius: 999,
                  padding: "6px 14px", color: isIn ? COLORS.bg : COLORS.gold, fontWeight: 800, fontSize: 11, cursor: "pointer",
                }}>{isIn ? "Invitado ✓" : f.inApp ? "Invitar" : "Enviar app"}</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "link" && (
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Comparte tu link de invitación
          </div>
          <div style={{
            background: COLORS.bgCard, border: `1px dashed ${COLORS.gold}88`, borderRadius: 14,
            padding: 18, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16,
          }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>{q ? q.emoji : "🏆"}</div>
            <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{q ? q.name : "Tu quiniela"}</div>
            <div style={{
              color: COLORS.gold, fontFamily: "var(--font-mono), 'Courier New', monospace", fontSize: 12.5,
              background: COLORS.bg, padding: "8px 12px", borderRadius: 8, marginTop: 6, wordBreak: "break-all", textAlign: "center",
            }}>{link}</div>
          </div>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{
            width: "100%", background: copied ? COLORS.teal : COLORS.gold, border: "none", borderRadius: 12,
            padding: "13px 0", color: copied ? COLORS.cream : COLORS.bg, fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}>{copied ? "¡Copiado!" : "Copiar link"}</button>
          <div style={{ color: COLORS.creamDim, fontSize: 11, textAlign: "center", marginTop: 10 }}>
            Cualquiera que entre desde este link se une directo al grupo, hasta llenar los {q ? q.max : 15} lugares.
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" }}>
          <Users size={30} color={COLORS.creamDim} style={{ marginBottom: 12 }} />
          <div style={{ color: COLORS.cream, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Encuentra amigos por contactos</div>
          <div style={{ color: COLORS.creamDim, fontSize: 12, marginBottom: 16, maxWidth: 260 }}>
            Te avisamos qué contactos de tu teléfono ya usan Quinielapp para invitarlos directo.
          </div>
          <button style={{
            background: COLORS.gold, border: "none", borderRadius: 999, padding: "10px 20px",
            color: COLORS.bg, fontWeight: 800, fontSize: 12.5, cursor: "pointer",
          }}>Permitir acceso a contactos</button>
        </div>
      )}

      <div style={{ padding: 14, borderTop: `1px solid ${COLORS.line}` }}>
        <button onClick={onClose} style={{
          width: "100%", background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 12,
          padding: "12px 0", color: COLORS.creamDim, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          {invited.length > 0 ? `Listo · ${invited.length} invitados` : "Cerrar"}
        </button>
      </div>
    </div>
  );
}

// ---------- Desktop: layout propio, no el mismo diseño de teléfono estirado ----------
// Detecta el viewport en el cliente (con listener de resize) para decidir entre el
// shell de teléfono (marco angosto + nav inferior) y el shell de escritorio
// (sidebar persistente + dashboard más completo con estadísticas extra).
function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isDesktop;
}

function SidebarNav({ tab, setTab }) {
  const items = [
    { id: "home", icon: HomeIcon, label: "Inicio" },
    { id: "quinielas", icon: Trophy, label: "Quinielas" },
    { id: "ranking", icon: BarChart3, label: "Ranking" },
    { id: "profile", icon: Users, label: "Perfil" },
  ];
  return (
    <div style={{
      width: 232, flexShrink: 0, borderRight: `1px solid ${COLORS.line}`,
      background: COLORS.bgCard, padding: "28px 14px", display: "flex",
      flexDirection: "column", gap: 3, position: "sticky", top: 0, height: "100vh",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", marginBottom: 34 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: COLORS.goldSoft,
          border: `1.5px solid ${COLORS.gold}`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <TicketLogo size={18} />
        </div>
        <span style={{ color: COLORS.cream, fontWeight: 700, fontSize: 15, letterSpacing: -0.2 }}>Quinielapp</span>
      </div>
      {items.map(it => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10,
            border: "none", cursor: "pointer", textAlign: "left",
            background: active ? COLORS.goldSoft : "transparent",
            color: active ? COLORS.gold : COLORS.creamDim, fontWeight: active ? 700 : 500, fontSize: 13.5,
          }}>
            <Icon size={17} strokeWidth={active ? 2.4 : 1.8} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// Barras simples en SVG/CSS — sin librería de gráficas, consistente con el resto
// de la app (todo hecho a mano). Estadística exclusiva de la vista de escritorio.
function AciertosChart() {
  const data = [4, 7, 5, 8, 6, 9];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90, marginTop: 14 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{
            width: "100%", height: `${(v / 10) * 70}px`, borderRadius: 4,
            background: i === data.length - 1 ? COLORS.gold : COLORS.line,
          }} />
          <span style={{ fontSize: 9, color: COLORS.creamDim }}>S{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

// Panel exclusivo de escritorio: estadísticas y contexto que en el teléfono no
// caben sin saturar la pantalla — aquí sí hay espacio de sobra para mostrarlas.
function DesktopRightPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <AdBanner placement="desktop_sidebar" />

      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 18 }}>
        <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Tu progreso</div>
        <div style={{ color: COLORS.cream, fontWeight: 800, fontSize: 15, marginTop: 4 }}>Aciertos por semana</div>
        <AciertosChart />
      </div>

      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 18 }}>
        <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Top ranking global</div>
        {GLOBAL_RANKING.slice(0, 5).map(p => (
          <div key={p.rank} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
            <span style={{ width: 16, textAlign: "center", fontFamily: "var(--font-mono), 'Courier New', monospace", color: p.rank === 1 ? COLORS.gold : COLORS.creamDim, fontWeight: 800, fontSize: 12 }}>{p.rank}</span>
            <span style={{ fontSize: 16 }}>{p.avatar}</span>
            <span style={{ flex: 1, color: COLORS.cream, fontSize: 12, fontWeight: 600 }}>{p.name}</span>
            <span style={{ color: COLORS.creamDim, fontSize: 11, fontFamily: "var(--font-mono), 'Courier New', monospace" }}>{p.aciertos}/10</span>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 18 }}>
        <div style={{ color: COLORS.creamDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Actividad reciente</div>
        {NOTIFICATIONS.slice(0, 4).map(n => (
          <div key={n.id} style={{ display: "flex", gap: 10, padding: "7px 0", alignItems: "flex-start" }}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: COLORS.cream, fontSize: 11.5, lineHeight: 1.4 }}>{n.title}</div>
              <div style={{ color: COLORS.creamDim, fontSize: 10, marginTop: 2 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard de escritorio: reutiliza HomeScreen tal cual como columna principal
// (misma lógica, mismos datos) y le suma la columna de estadísticas de al lado —
// nada se duplica, solo se le da más aire y más contexto al mismo contenido.
function DesktopDashboard(props) {
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start", maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ flex: "1 1 620px", minWidth: 0 }}>
        <HomeScreen {...props} />
      </div>
      <div style={{ flex: "0 0 300px" }}>
        <DesktopRightPanel />
      </div>
    </div>
  );
}

export default function MiQuinielaApp() {
  const { data: session, status } = useSession(); // "loading" | "authenticated" | "unauthenticated"
  const [authStep, setAuthStep] = useState("login"); // login | friendsFound | app
  const [tab, setTab] = useState("home");
  const [openQuiniela, setOpenQuiniela] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteAfterCreate, setShowInviteAfterCreate] = useState(null);
  const [plan, setPlan] = useState("free");
  const [showPlan, setShowPlan] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvertise, setShowAdvertise] = useState(false);
  const [joinedGlobal, setJoinedGlobal] = useState(false);

  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;
  const isDesktop = useIsDesktop();
  const fromFacebook = session?.provider === "facebook";

  // Traduce el estado real de NextAuth (sesión sí/no) a las pantallas de este
  // prototipo. La pantalla "encontramos a tus amigos" solo tiene sentido justo
  // después de entrar por Facebook, así que se muestra una vez por pestaña del
  // navegador (sessionStorage), no cada vez que la sesión sigue activa en una
  // recarga normal de la página.
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setAuthStep("login");
      return;
    }
    // status === "authenticated"
    const alreadyShown = typeof window !== "undefined" && sessionStorage.getItem("qp_friends_shown");
    if (session?.provider === "facebook" && !alreadyShown) {
      sessionStorage.setItem("qp_friends_shown", "1");
      setAuthStep("friendsFound");
    } else {
      setAuthStep("app");
    }
  }, [status, session]);

  const homeProps = {
    onOpenQuiniela: setOpenQuiniela, onCreate: () => setShowCreate(true),
    fromFacebook, plan, onOpenPlan: () => setShowPlan(true),
    onOpenNotifications: () => setShowNotifications(true), unreadCount,
  };

  const modals = (
    <>
      {showCreate && (
        <CreateQuinielaModal
          onClose={() => setShowCreate(false)}
          onCreated={(newQ) => { setShowCreate(false); setShowInviteAfterCreate(newQ); }}
          plan={plan}
          onOpenPlan={() => setShowPlan(true)}
        />
      )}
      {showInviteAfterCreate && (
        <InviteFriendsScreen q={showInviteAfterCreate} onClose={() => setShowInviteAfterCreate(null)} />
      )}
      {showPlan && (
        <PlanScreen plan={plan} onClose={() => setShowPlan(false)} onUpgrade={() => { setPlan("premium"); setShowPlan(false); }} />
      )}
      {showNotifications && <NotificationsScreen onClose={() => setShowNotifications(false)} />}
      {showHistory && <HistoryScreen onClose={() => setShowHistory(false)} />}
      {showAdvertise && <AdvertiseScreen onClose={() => setShowAdvertise(false)} />}
      {showSettings && (
        <SettingsScreen
          plan={plan}
          onClose={() => setShowSettings(false)}
          onDowngrade={() => setPlan("free")}
          onLogout={() => { setShowSettings(false); signOut(); }}
          // TODO: cuando exista DELETE /api/users, llamarlo aquí antes de cerrar sesión.
          onDeleteAccount={() => { setShowSettings(false); setPlan("free"); signOut(); }}
        />
      )}
    </>
  );

  // ---------- Escritorio: sidebar persistente + dashboard con panel de estadísticas ----------
  // Mientras NextAuth confirma si ya había sesión (cookie), no mostramos nada
  // todavía — evita el parpadeo de "login" antes de saltar directo a la app.
  if (status === "loading") {
    return <div style={{ width: "100%", minHeight: "100vh", background: COLORS.bg }} />;
  }

  if (isDesktop) {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", background: COLORS.bg, position: "relative",
        overflow: "hidden", fontFamily: "var(--font-display), 'Helvetica Neue', Arial, sans-serif",
      }}>
        {authStep !== "app" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", width: "100%" }}>
            <div style={{
              width: 420, maxWidth: "92vw", minHeight: 640, background: COLORS.bg,
              border: `1px solid ${COLORS.line}`, borderRadius: 20, overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              {authStep === "login" && <LoginScreen />}
              {authStep === "friendsFound" && (
                <FriendsFoundScreen onContinue={() => setAuthStep("app")} />
              )}
            </div>
          </div>
        ) : openQuiniela ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <SidebarNav tab={tab} setTab={(t) => { setOpenQuiniela(null); setTab(t); }} />
            <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: 24 }}>
              <div style={{
                width: "100%", maxWidth: 560, height: "calc(100vh - 48px)", background: COLORS.bg,
                border: `1px solid ${COLORS.line}`, borderRadius: 20, overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                <QuinielaDetail q={openQuiniela} onBack={() => setOpenQuiniela(null)} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <SidebarNav tab={tab} setTab={setTab} />
            <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto", height: "100vh" }}>
              {tab === "home" && <DesktopDashboard {...homeProps} />}
              {tab === "quinielas" && <DesktopDashboard {...homeProps} />}
              {tab === "ranking" && (
                <div style={{ maxWidth: 640, margin: "0 auto" }}>
                  <RankingScreen onJoinGlobal={() => setJoinedGlobal(true)} joinedGlobal={joinedGlobal} />
                </div>
              )}
              {tab === "profile" && (
                <div style={{ maxWidth: 520, margin: "0 auto" }}>
                  <ProfileScreen plan={plan} onOpenPlan={() => setShowPlan(true)} onOpenHistory={() => setShowHistory(true)} onOpenSettings={() => setShowSettings(true)} onOpenAdvertise={() => setShowAdvertise(true)} />
                </div>
              )}
            </div>
          </div>
        )}
        {modals}
      </div>
    );
  }

  // ---------- Teléfono: el marco angosto de siempre, sin cambios ----------
  return (
    <div style={{
      width: "100%", minHeight: "100vh", display: "flex", justifyContent: "center",
      background: "#050d09", fontFamily: "var(--font-display), 'Helvetica Neue', Arial, sans-serif",
    }}>
      <div style={{
        width: 390, maxWidth: "100vw", minHeight: "100vh", background: COLORS.bg,
        display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
      }}>
        {authStep === "login" && <LoginScreen />}
        {authStep === "friendsFound" && (
          <FriendsFoundScreen onContinue={() => setAuthStep("app")} />
        )}
        {authStep === "app" && (
          openQuiniela ? (
            <QuinielaDetail q={openQuiniela} onBack={() => setOpenQuiniela(null)} />
          ) : (
            <>
              {tab === "home" && <HomeScreen {...homeProps} />}
              {tab === "quinielas" && <HomeScreen {...homeProps} />}
              {tab === "ranking" && <RankingScreen onJoinGlobal={() => setJoinedGlobal(true)} joinedGlobal={joinedGlobal} />}
              {tab === "profile" && <ProfileScreen plan={plan} onOpenPlan={() => setShowPlan(true)} onOpenHistory={() => setShowHistory(true)} onOpenSettings={() => setShowSettings(true)} onOpenAdvertise={() => setShowAdvertise(true)} />}
              <BottomNav tab={tab} setTab={setTab} />
            </>
          )
        )}
        {modals}
      </div>
    </div>
  );
}
