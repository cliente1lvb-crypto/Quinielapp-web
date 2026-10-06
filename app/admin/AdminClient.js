"use client";
import React, { useEffect, useState, useCallback } from "react";

// Panel de administración de Quinielapp: monitoreo en vivo + gestión de torneos,
// Quiniela Global, marcadores, publicidad y reportes. Todo lee y escribe contra
// /api/admin/* (protegido por ADMIN_EMAILS).

const C = {
  // Panel de admin: siempre oscuro, con el naranja de la marca.
  bg: "#0A0A0A", card: "#141414", card2: "#1C1C1C", line: "#262626",
  green: "#FF5A1F", greenSoft: "#FF5A1F1f", cream: "#F5F5F4", dim: "#8F8F8C",
  red: "#FF2D2D", amber: "#F5B83D", teal: "#A3A3A0",
};
const MONO = "var(--font-mono), ui-monospace, monospace";

async function api(path, { method = "GET", body } = {}) {
  try {
    const r = await fetch(path, {
      method, cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) return { ok: false, error: d.error || `Error ${r.status}` };
    return { ok: true, ...d };
  } catch {
    return { ok: false, error: "Sin conexión" };
  }
}

function ago(iso, now = Date.now()) {
  if (!iso) return "—";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${Math.floor(s)} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}
const fmtDate = (d) => d ? new Date(d).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const toLocalInput = (d) => { if (!d) return ""; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

// ---------- piezas de UI ----------
const inputStyle = {
  width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9,
  padding: "9px 11px", color: C.cream, fontSize: 13, outline: "none", fontFamily: "inherit",
};
function Field({ label, children, span = 1 }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: `span ${span}`, minWidth: 0 }}>
      <span style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      {children}
    </label>
  );
}
function Btn({ children, onClick, kind = "primary", disabled, small }) {
  const s = {
    primary: { background: C.green, color: C.bg, border: "none" },
    ghost: { background: "transparent", color: C.cream, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.red}66` },
  }[kind];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...s, borderRadius: 9, padding: small ? "6px 10px" : "9px 14px", fontWeight: 700,
      fontSize: small ? 11.5 : 12.5, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}
function Card({ title, right, children, pad = 18 }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: pad, minWidth: 0 }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
          <div style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ color: accent || C.cream, fontSize: 26, fontWeight: 700, fontFamily: MONO, marginTop: 4 }}>{value ?? "—"}</div>
      {sub && <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function Pill({ children, color = C.dim }) {
  return <span style={{ color, background: `${color}22`, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 8px", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}
function Table({ head, rows, empty }) {
  if (rows && rows.error) return <div style={{ color: C.red, fontSize: 12.5 }}>No disponible: {rows.error}</div>;
  if (!rows || rows.length === 0) return <div style={{ color: C.dim, fontSize: 12.5, padding: "10px 0" }}>{empty}</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>{head.map(h => <th key={h} style={{ textAlign: "left", color: C.dim, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.8, padding: "8px 10px", borderBottom: `1px solid ${C.line}` }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} style={{ color: C.cream, padding: "9px 10px", borderBottom: `1px solid ${C.line}`, verticalAlign: "middle" }}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Msg({ m }) {
  if (!m) return null;
  return <div style={{ color: m.ok ? C.green : C.red, fontSize: 12, marginTop: 8 }}>{m.text}</div>;
}

// ---------- pestaña: En vivo ----------
const EVENT_META = {
  registro: ["👤", "se registró", C.teal],
  quiniela: ["🏆", "creó la quiniela", C.green],
  union: ["🎟️", "se unió a", C.green],
  pronostico: ["🎯", "pronosticó", C.cream],
  chat: ["💬", "escribió", C.dim],
  boleto: ["🧾", "mandó boleto del", C.amber],
  torneo: ["🥇", "entró al torneo", C.amber],
  lead: ["📣", "pidió info para anunciarse", C.teal],
  reporte: ["🚩", "reportó", C.red],
};

function FootballCard({ f, tick }) {
  const [syncing, setSyncing] = useState(false);
  const [res, setRes] = useState(null);
  if (!f) return null;
  const pct = f.limit ? Math.min(100, Math.round(((f.used || 0) / f.limit) * 100)) : 0;
  const ls = f.lastSync;
  const color = !f.configured ? C.amber : f.ok === false ? C.red : C.green;
  const forceSync = async () => {
    setSyncing(true);
    const r = await api("/api/admin/sync", { method: "POST" });
    setSyncing(false);
    setRes(r.ok ? r.result : { error: r.error });
  };
  return (
    <div style={{ background: C.card, border: `1px solid ${color}55`, borderRadius: 14, padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 22 }}>⚽</span>
        <div>
          <div style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>
            API-Football {!f.configured ? "· sin clave" : f.ok === false ? "· con error" : "· conectada"}
          </div>
          <div style={{ color: f.ok === false ? C.red : C.dim, fontSize: 11.5 }}>
            {!f.configured ? "Agrega API_FOOTBALL_KEY en Vercel" : f.ok === false ? f.error : `Plan ${f.plan || "—"}${f.planEnd ? ` · vence ${fmtDate(f.planEnd)}` : ""}`}
          </div>
        </div>
      </div>
      {f.configured && f.ok !== false && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 11, marginBottom: 5 }}>
            <span>Consultas hoy</span><span style={{ fontFamily: MONO, color: C.cream }}>{f.used ?? "—"} / {f.limit ?? "—"}</span>
          </div>
          <div style={{ height: 7, background: C.line, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct > 85 ? C.red : pct > 60 ? C.amber : C.green }} />
          </div>
        </div>
      )}
      {f.configured && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ color: C.dim, fontSize: 11.5, lineHeight: 1.5 }}>
            Marcadores sincronizados: <b style={{ color: C.cream }}>{ls ? ago(ls.at, tick) : "nunca"}</b>
            {ls && <div>{ls.checked || 0} partidos revisados · {ls.updated || 0} actualizados{ls.error ? ` · error: ${ls.error}` : ""}</div>}
            {res && <div style={{ color: res.error ? C.red : C.green }}>{res.error || (res.skipped ? `Omitido: ${res.skipped}` : `Listo: ${res.updated} actualizados`)}</div>}
          </div>
          <Btn small kind="ghost" onClick={forceSync} disabled={syncing}>{syncing ? "..." : "Sincronizar ya"}</Btn>
        </div>
      )}
    </div>
  );
}

function LiveTab() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    const r = await api("/api/admin/live");
    if (r.ok) { setD(r); setErr(""); setLastFetch(Date.now()); } else setErr(r.error);
  }, []);
  useEffect(() => {
    load();
    const a = setInterval(load, 5000);
    const b = setInterval(() => setTick(Date.now()), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [load]);

  if (!d) return <div style={{ color: err ? C.red : C.dim }}>{err || "Conectando..."}</div>;

  const secsSinceEvent = d.lastEventAt ? (tick - new Date(d.lastEventAt).getTime()) / 1000 : Infinity;
  const receiving = secsSinceEvent < 120;
  const connected = d.health.dbOk && !err && lastFetch && tick - lastFetch < 15000;
  const max = Math.max(1, ...d.series.map(s => s.n));
  const k = d.kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Estado en tiempo real */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div style={{ background: C.card, border: `1px solid ${connected ? C.green + "55" : C.red + "66"}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center" }}>
          <span className={connected ? "qa-pulse" : ""} style={{ width: 12, height: 12, borderRadius: "50%", background: connected ? C.green : C.red, flexShrink: 0 }} />
          <div>
            <div style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>{connected ? "Conectado en tiempo real" : "Sin conexión"}</div>
            <div style={{ color: C.dim, fontSize: 11.5 }}>
              {connected ? `Base de datos respondió en ${d.health.dbLatency} ms · actualiza cada 5 s` : (err || d.health.dbError || "Reintentando...")}
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${receiving ? C.green + "55" : C.line}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>{receiving ? "📡" : "💤"}</span>
          <div>
            <div style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>{receiving ? "Recibiendo datos" : "Sin actividad reciente"}</div>
            <div style={{ color: C.dim, fontSize: 11.5 }}>Último dato de un usuario: {ago(d.lastEventAt, tick)}</div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuración</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(d.health.env).map(([name, on]) => (
              <Pill key={name} color={on ? C.green : name === "API_FOOTBALL" || name === "FACEBOOK" || name === "GOOGLE" ? C.amber : C.red}>
                {on ? "✓" : "✕"} {name}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* API-Football */}
      <FootballCard f={d.football} tick={tick} />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Stat label="Activos (15 min)" value={k.active15} accent={k.active15 ? C.green : undefined} sub="usuarios haciendo algo" />
        <Stat label="Usuarios" value={k.users} sub={`+${k.users_today || 0} hoy`} />
        <Stat label="Quinielas" value={k.quinielas} sub={`+${k.quinielas_today || 0} hoy`} />
        <Stat label="Pronósticos" value={k.predictions} sub={`${k.predictions_today || 0} hoy`} />
        <Stat label="Mensajes hoy" value={k.chat_today} />
        <Stat label="Boletos sorteo abierto" value={k.tickets_open} />
        <Stat label="Torneos activos" value={k.tournaments_active} />
        <Stat label="Leads anunciantes" value={k.leads} sub={`${k.reports_week || 0} reportes esta semana`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 16 }} className="qa-two">
        <Card title="Actividad por minuto (últimos 30 min)" right={<span style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>máx {max}/min</span>}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 150 }}>
            {d.series.map((s, i) => (
              <div key={i} title={`${s.label} · ${s.n} eventos`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ height: `${Math.max(s.n ? 6 : 2, (s.n / max) * 100)}%`, background: s.n ? C.green : C.line, borderRadius: 3, opacity: i === d.series.length - 1 ? 1 : 0.85 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.dim, fontSize: 10.5, marginTop: 6, fontFamily: MONO }}>
            <span>{d.series[0] && d.series[0].label}</span><span>ahora</span>
          </div>
        </Card>

        <Card title="Actividad en vivo" right={<Pill color={C.green}>● LIVE</Pill>} pad={0}>
          <div style={{ maxHeight: 360, overflowY: "auto", padding: "0 18px 12px" }}>
            {d.events.length === 0 && <div style={{ color: C.dim, fontSize: 12.5, padding: "10px 0" }}>Todavía no hay actividad en los últimos 7 días.</div>}
            {d.events.map((e, i) => {
              const [icon, verb, color] = EVENT_META[e.kind] || ["•", e.kind, C.dim];
              return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}`, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.45 }}>
                    <b style={{ color: C.cream }}>{e.who}</b> <span style={{ color: C.dim }}>{verb}</span>{" "}
                    <span style={{ color }}>{e.detail}</span>
                  </div>
                  <span style={{ color: C.dim, fontSize: 10.5, whiteSpace: "nowrap", fontFamily: MONO }}>{ago(e.at, tick)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------- pestaña: Torneos ----------
const REGIONS = ["Nacional", "CDMX", "Estado de México", "Jalisco", "Nuevo León", "Puebla", "Guanajuato", "Querétaro", "Yucatán", "Baja California", "Veracruz"];
const T_STATUS = { draft: ["Borrador", C.dim], open: ["Inscripciones abiertas", C.green], running: ["En curso", C.amber], finished: ["Finalizado", C.dim] };
const EMPTY_T = { name: "", emoji: "🏆", region: "Nacional", customRegion: "", prize: "", description: "", starts_at: "", ends_at: "", max_players: "", status: "open" };

function TournamentsTab() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(EMPTY_T);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api("/api/admin/tournaments");
    setList(r.ok ? r.tournaments : { error: r.error });
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true); setMsg(null);
    const body = { ...form, region: form.region === "__otra" ? form.customRegion : form.region };
    const r = editing
      ? await api("/api/admin/tournaments", { method: "PATCH", body: { id: editing, ...body } })
      : await api("/api/admin/tournaments", { method: "POST", body });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: editing ? "Torneo actualizado." : `Torneo "${r.tournament.name}" creado. Ya lo ven los usuarios en Ranking → Torneos.` });
    setForm(EMPTY_T); setEditing(null); load();
  };
  const edit = (t) => {
    setEditing(t.id);
    setForm({
      name: t.name, emoji: t.emoji, region: REGIONS.includes(t.region) ? t.region : "__otra", customRegion: REGIONS.includes(t.region) ? "" : t.region,
      prize: t.prize || "", description: t.description || "", starts_at: toLocalInput(t.starts_at), ends_at: toLocalInput(t.ends_at),
      max_players: t.max_players || "", status: t.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const setStatus = async (t, status) => { await api("/api/admin/tournaments", { method: "PATCH", body: { id: t.id, status } }); load(); };
  const remove = async (t) => {
    if (!window.confirm(`¿Borrar "${t.name}" y sus ${t.players} inscripciones?`)) return;
    await api(`/api/admin/tournaments?id=${t.id}`, { method: "DELETE" }); load();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)", gap: 16, alignItems: "start" }} className="qa-two">
      <Card title={editing ? "Editar torneo" : "Nuevo torneo"} right={editing && <Btn small kind="ghost" onClick={() => { setEditing(null); setForm(EMPTY_T); }}>Cancelar</Btn>}>
        <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 12 }}>
          <Field label="Emoji"><input value={form.emoji} onChange={set("emoji")} style={{ ...inputStyle, textAlign: "center", fontSize: 18 }} /></Field>
          <Field label="Nombre"><input value={form.name} onChange={set("name")} placeholder="Ej. Copa Tapatía Apertura" style={inputStyle} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Field label="Región">
            <select value={form.region} onChange={set("region")} style={inputStyle}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__otra">Otra…</option>
            </select>
          </Field>
          {form.region === "__otra"
            ? <Field label="Nombre de la región"><input value={form.customRegion} onChange={set("customRegion")} placeholder="Ej. Sonora" style={inputStyle} /></Field>
            : <Field label="Cupo máximo"><input type="number" min="1" value={form.max_players} onChange={set("max_players")} placeholder="Sin límite" style={inputStyle} /></Field>}
          <Field label="Inicia"><input type="datetime-local" value={form.starts_at} onChange={set("starts_at")} style={{ ...inputStyle, colorScheme: "dark" }} /></Field>
          <Field label="Termina"><input type="datetime-local" value={form.ends_at} onChange={set("ends_at")} style={{ ...inputStyle, colorScheme: "dark" }} /></Field>
          {form.region === "__otra" && <Field label="Cupo máximo" span={2}><input type="number" min="1" value={form.max_players} onChange={set("max_players")} placeholder="Sin límite" style={inputStyle} /></Field>}
          <Field label="Premio" span={2}><input value={form.prize} onChange={set("prize")} placeholder="Ej. Playera oficial + 3 meses Premium" style={inputStyle} /></Field>
          <Field label="Descripción" span={2}><textarea value={form.description} onChange={set("description")} rows={2} placeholder="Reglas o detalles para los jugadores" style={{ ...inputStyle, resize: "vertical" }} /></Field>
          <Field label="Estado" span={2}>
            <select value={form.status} onChange={set("status")} style={inputStyle}>
              {Object.entries(T_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ color: C.dim, fontSize: 11, lineHeight: 1.5, margin: "12px 0" }}>
          La tabla del torneo suma los aciertos de cada inscrito en los sorteos de la Quiniela Global que cierran entre esas fechas.
        </div>
        <Btn onClick={submit} disabled={busy || !form.name.trim()}>{busy ? "Guardando..." : editing ? "Guardar cambios" : "Crear torneo"}</Btn>
        <Msg m={msg} />
      </Card>

      <Card title="Torneos" right={<span style={{ color: C.dim, fontSize: 11 }}>{Array.isArray(list) ? list.length : 0} en total</span>}>
        {list === null ? <div style={{ color: C.dim }}>Cargando...</div> : list.error ? <div style={{ color: C.red, fontSize: 12.5 }}>{list.error} — ¿ya corriste db/schema_v3_torneos_admin.sql en Neon?</div> : list.length === 0 ? (
          <div style={{ color: C.dim, fontSize: 12.5 }}>Todavía no hay torneos. Crea el primero con el formulario.</div>
        ) : list.map(t => {
          const [label, color] = T_STATUS[t.status] || [t.status, C.dim];
          return (
            <div key={t.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, marginBottom: 10, background: C.card2 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24 }}>{t.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: C.cream, fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                    <Pill color={color}>{label}</Pill>
                    <Pill color={C.teal}>📍 {t.region}</Pill>
                  </div>
                  <div style={{ color: C.dim, fontSize: 11.5, marginTop: 4 }}>
                    {fmtDate(t.starts_at)} → {t.ends_at ? fmtDate(t.ends_at) : "sin fecha de fin"} · {t.players}{t.max_players ? `/${t.max_players}` : ""} jugadores
                    {t.leader ? ` · líder: ${t.leader}` : ""}
                  </div>
                  {t.prize && <div style={{ color: C.green, fontSize: 11.5, marginTop: 3 }}>🎁 {t.prize}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <Btn small kind="ghost" onClick={() => edit(t)}>Editar</Btn>
                {t.status === "draft" && <Btn small onClick={() => setStatus(t, "open")}>Publicar</Btn>}
                {t.status === "open" && <Btn small onClick={() => setStatus(t, "running")}>Arrancar</Btn>}
                {t.status === "running" && <Btn small kind="ghost" onClick={() => setStatus(t, "finished")}>Finalizar</Btn>}
                <Btn small kind="danger" onClick={() => remove(t)}>Borrar</Btn>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ---------- pestaña: Quiniela Global ----------
function DrawsTab() {
  const [draws, setDraws] = useState(null);
  const [results, setResults] = useState({});
  const [msg, setMsg] = useState(null);
  const [nd, setNd] = useState({ id: "", close_label: "", closes_at: "", closeOthers: true, matches: Array.from({ length: 10 }, () => ({ home: "", away: "", league: "" })) });

  const load = useCallback(async () => {
    const r = await api("/api/admin/draws");
    if (r.ok) {
      setDraws(r.draws);
      setResults(Object.fromEntries(r.draws.map(d => [d.id, Object.fromEntries(d.matches.map(m => [m.n, m.result]))])));
      if (!nd.id && r.draws[0]) setNd(x => ({ ...x, id: String(r.draws[0].id + 1) }));
    } else setDraws({ error: r.error });
  }, [nd.id]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  const saveResults = async (d) => {
    const r = await api("/api/admin/draws", { method: "PATCH", body: { id: d.id, results: results[d.id] } });
    setMsg({ ok: r.ok, text: r.ok ? `Resultados del sorteo #${d.id} guardados: el ranking ya se recalculó.` : r.error }); load();
  };
  const setStatus = async (d, status) => { await api("/api/admin/draws", { method: "PATCH", body: { id: d.id, status } }); load(); };
  const create = async () => {
    const r = await api("/api/admin/draws", { method: "POST", body: nd });
    setMsg({ ok: r.ok, text: r.ok ? `Sorteo #${nd.id} creado y abierto.` : r.error });
    if (r.ok) { setNd({ id: String(parseInt(nd.id, 10) + 1), close_label: "", closes_at: "", closeOthers: true, matches: Array.from({ length: 10 }, () => ({ home: "", away: "", league: "" })) }); load(); }
  };
  const setM = (i, k) => (e) => setNd(x => ({ ...x, matches: x.matches.map((m, j) => j === i ? { ...m, [k]: e.target.value, ...(k !== "league" ? { apiId: null, kickoffAt: null } : {}) } : m) }));
  const [filling, setFilling] = useState(false);
  const autofill = async () => {
    setFilling(true);
    const r = await api("/api/admin/fixtures-suggest");
    setFilling(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    const ms = r.matches.map(m => ({ home: m.home, away: m.away, league: m.league, apiId: m.apiId, kickoffAt: m.kickoffAt, date: m.date }));
    while (ms.length < 10) ms.push({ home: "", away: "", league: "" });
    const first = r.matches[0];
    setNd(x => ({ ...x, matches: ms, close_label: x.close_label || (first ? first.date : "") }));
    setMsg({ ok: true, text: `Se cargaron ${r.matches.length} partidos reales (2 por cada una de las 5 grandes ligas). El sorteo cierra solo al arrancar el primero.` });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Msg m={msg} />
      {draws === null ? <div style={{ color: C.dim }}>Cargando...</div> : draws.error ? <div style={{ color: C.red }}>{draws.error}</div> : draws.map(d => (
        <Card key={d.id} title={`Sorteo #${d.id}`} right={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Pill color={d.status === "open" ? C.green : d.status === "closed" ? C.amber : C.dim}>{d.status === "open" ? "Abierto" : d.status === "closed" ? "Cerrado" : "Finalizado"}</Pill>
            <span style={{ color: C.dim, fontSize: 11.5 }}>{d.tickets} boletos · cierra {d.close_label || fmtDate(d.closes_at)}</span>
          </div>
        }>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
            {d.matches.map(m => (
              <div key={m.n} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px" }}>
                <span style={{ color: C.dim, fontFamily: MONO, width: 18, fontSize: 12 }}>{m.n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.cream, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.home_team} vs {m.away_team}</div>
                  <div style={{ color: C.dim, fontSize: 10.5 }}>{m.league}</div>
                </div>
                {["L", "E", "V"].map(v => {
                  const on = (results[d.id] || {})[m.n] === v;
                  return (
                    <button key={v} onClick={() => setResults(r => ({ ...r, [d.id]: { ...r[d.id], [m.n]: on ? null : v } }))} style={{
                      width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontWeight: 800, fontSize: 11.5,
                      border: `1px solid ${on ? C.green : C.line}`, background: on ? C.green : C.bg, color: on ? C.bg : C.dim,
                    }}>{v}</button>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Btn onClick={() => saveResults(d)}>Guardar resultados</Btn>
            {d.status === "open" && <Btn kind="ghost" onClick={() => setStatus(d, "closed")}>Cerrar boletos</Btn>}
            {d.status === "closed" && <Btn kind="ghost" onClick={() => setStatus(d, "open")}>Reabrir</Btn>}
            {d.status !== "finished" && <Btn kind="ghost" onClick={() => setStatus(d, "finished")}>Marcar finalizado</Btn>}
          </div>
        </Card>
      ))}

      <Card title="Crear nuevo sorteo" right={<Btn small kind="ghost" onClick={autofill} disabled={filling}>{filling ? "Buscando..." : "⚽ Llenar con partidos reales"}</Btn>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Número de sorteo"><input value={nd.id} onChange={e => setNd({ ...nd, id: e.target.value })} style={inputStyle} /></Field>
          <Field label="Cierra (fecha y hora)"><input type="datetime-local" value={nd.closes_at} onChange={e => setNd({ ...nd, closes_at: e.target.value })} style={{ ...inputStyle, colorScheme: "dark" }} /></Field>
          <Field label="Texto de cierre (lo ven los usuarios)"><input value={nd.close_label} onChange={e => setNd({ ...nd, close_label: e.target.value })} placeholder="Vie 28 Ago, 6:00 PM" style={inputStyle} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 8, marginTop: 14 }}>
          {nd.matches.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr 110px", gap: 6, alignItems: "center" }} title={m.date ? `${m.date}${m.apiId ? " · enlazado a API-Football" : ""}` : ""}>
              <span style={{ color: m.apiId ? C.green : C.dim, fontFamily: MONO, fontSize: 12 }}>{i + 1}</span>
              <input value={m.home} onChange={setM(i, "home")} placeholder="Local" style={inputStyle} />
              <input value={m.away} onChange={setM(i, "away")} placeholder="Visitante" style={inputStyle} />
              <input value={m.league} onChange={setM(i, "league")} placeholder="Liga" style={inputStyle} />
            </div>
          ))}
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: C.dim, fontSize: 12, margin: "12px 0" }}>
          <input type="checkbox" checked={nd.closeOthers} onChange={e => setNd({ ...nd, closeOthers: e.target.checked })} /> Cerrar los sorteos abiertos anteriores
        </label>
        <Btn onClick={create}>Crear sorteo</Btn>
      </Card>
    </div>
  );
}

// ---------- pestaña: Marcadores ----------
function GamesTab() {
  const [games, setGames] = useState(null);
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => {
    const r = await api("/api/admin/games");
    setGames(r.ok ? r.games : { error: r.error });
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const val = (g, k) => (edit[g.key] && edit[g.key][k] !== undefined ? edit[g.key][k] : g[k] ?? "");
  const setV = (g, k) => (e) => setEdit(x => ({ ...x, [g.key]: { ...x[g.key], [k]: e.target.value } }));
  const save = async (g, status) => {
    const r = await api("/api/admin/games", { method: "PATCH", body: { home: g.home, away: g.away, label: g.label, hs: val(g, "hs"), as: val(g, "as"), minute: val(g, "minute"), status } });
    setMsg({ ok: r.ok, text: r.ok ? `${g.home} vs ${g.away}: actualizado en ${r.updated} quiniela(s). Las tablas ya se recalcularon.` : r.error });
    setEdit(x => { const y = { ...x }; delete y[g.key]; return y; }); load();
  };
  const small = { ...inputStyle, width: 54, textAlign: "center", fontFamily: MONO, padding: "7px 6px" };

  return (
    <Card title="Marcadores de las quinielas" right={<span style={{ color: C.dim, fontSize: 11 }}>Mientras no esté conectada la API de fútbol, captúralos aquí</span>}>
      <Msg m={msg} />
      {games === null ? <div style={{ color: C.dim }}>Cargando...</div> : games.error ? <div style={{ color: C.red }}>{games.error}</div> : games.length === 0 ? (
        <div style={{ color: C.dim, fontSize: 12.5 }}>Todavía nadie ha creado quinielas con partidos.</div>
      ) : (
        <Table
          head={["Partido", "Liga · hora", "Estado", "Marcador", "Min", "Uso", ""]}
          rows={games.map(g => [
            <span key="p" style={{ fontWeight: 600 }}>{g.home} vs {g.away}</span>,
            <span key="l" style={{ color: C.dim }}>{g.league}{g.label ? ` · ${g.label}` : ""}</span>,
            <Pill key="s" color={g.status === "live" ? C.red : g.status === "finished" ? C.dim : C.teal}>{g.status === "live" ? "● En vivo" : g.status === "finished" ? "Final" : "Programado"}</Pill>,
            <span key="m" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={val(g, "hs")} onChange={setV(g, "hs")} style={small} placeholder="-" />
              <span style={{ color: C.dim }}>-</span>
              <input value={val(g, "as")} onChange={setV(g, "as")} style={small} placeholder="-" />
            </span>,
            <input key="min" value={val(g, "minute")} onChange={setV(g, "minute")} placeholder="67'" style={{ ...small, width: 60 }} />,
            <span key="u" style={{ color: C.dim, fontSize: 11.5 }}>{g.quinielas} quin. · {g.predictions} pron.</span>,
            <span key="a" style={{ display: "flex", gap: 6 }}>
              <Btn small kind="ghost" onClick={() => save(g, "live")}>En vivo</Btn>
              <Btn small onClick={() => save(g, "finished")}>Final</Btn>
              {g.status !== "scheduled" && <Btn small kind="ghost" onClick={() => save(g, "scheduled")}>Reset</Btn>}
            </span>,
          ])}
        />
      )}
    </Card>
  );
}

// ---------- pestañas de listas ----------
function useTables() {
  const [t, setT] = useState(null);
  const load = useCallback(async () => { const r = await api("/api/admin/tables"); setT(r.ok ? r : { error: r.error }); }, []);
  useEffect(() => { load(); const i = setInterval(load, 20000); return () => clearInterval(i); }, [load]);
  return [t, load];
}

function UsersTab({ t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Usuarios (últimos 100)">
        <Table head={["Nombre", "Correo", "Plan", "Origen", "Quinielas", "Registro"]}
          rows={t.users.error ? t.users : t.users.map(u => [u.name, u.email, u.plan, u.provider, u.quinielas, fmtDate(u.created_at)])}
          empty="Todavía no hay usuarios." />
      </Card>
      <Card title="Quinielas (últimas 100)">
        <Table head={["Quiniela", "Código", "Admin", "Miembros", "Partidos", "Creada"]}
          rows={t.quinielas.error ? t.quinielas : t.quinielas.map(q => [q.name, <span key="c" style={{ fontFamily: MONO, color: C.green }}>{q.code}</span>, q.owner, q.members, q.games, fmtDate(q.created_at)])}
          empty="Todavía no hay quinielas." />
      </Card>
    </div>
  );
}

function AdsTab({ t, reload }) {
  const [f, setF] = useState({ advertiser: "", placement: "home_banner", image_url: "", target_url: "", ends_at: "" });
  const [msg, setMsg] = useState(null);
  const create = async () => {
    const r = await api("/api/admin/ads", { method: "POST", body: f });
    setMsg({ ok: r.ok, text: r.ok ? "Anuncio publicado. Ya aparece en la app." : r.error });
    if (r.ok) { setF({ advertiser: "", placement: "home_banner", image_url: "", target_url: "", ends_at: "" }); reload(); }
  };
  const toggle = async (a) => { await api("/api/admin/ads", { method: "PATCH", body: { id: a.id, active: !a.active } }); reload(); };
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Publicar anuncio">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Field label="Anunciante"><input value={f.advertiser} onChange={set("advertiser")} style={inputStyle} /></Field>
          <Field label="Espacio">
            <select value={f.placement} onChange={set("placement")} style={inputStyle}>
              <option value="home_banner">Banner de Inicio (320×100)</option>
              <option value="ranking_banner">Banner de Ranking (320×100)</option>
              <option value="desktop_sidebar">Lateral escritorio (300×250)</option>
            </select>
          </Field>
          <Field label="URL de la imagen"><input value={f.image_url} onChange={set("image_url")} placeholder="https://..." style={inputStyle} /></Field>
          <Field label="URL de destino"><input value={f.target_url} onChange={set("target_url")} placeholder="https://..." style={inputStyle} /></Field>
          <Field label="Termina (opcional)"><input type="datetime-local" value={f.ends_at} onChange={set("ends_at")} style={{ ...inputStyle, colorScheme: "dark" }} /></Field>
        </div>
        <div style={{ marginTop: 12 }}><Btn onClick={create}>Publicar anuncio</Btn></div>
        <Msg m={msg} />
      </Card>
      <Card title="Anuncios">
        <Table head={["Anunciante", "Espacio", "Impresiones", "Clics", "CTR", "Estado", ""]}
          rows={t.ads.error ? t.ads : t.ads.map(a => [a.advertiser, a.placement, a.impressions, a.clicks,
            a.impressions ? `${((a.clicks / a.impressions) * 100).toFixed(1)}%` : "—",
            <Pill key="s" color={a.active ? C.green : C.dim}>{a.active ? "Activo" : "Pausado"}</Pill>,
            <Btn key="b" small kind="ghost" onClick={() => toggle(a)}>{a.active ? "Pausar" : "Activar"}</Btn>])}
          empty="Sin anuncios todavía — mientras tanto la app muestra «Anúnciate aquí»." />
      </Card>
      <Card title="Empresas interesadas (formulario Anúnciate)">
        <Table head={["Empresa", "Correo", "Fecha"]}
          rows={t.leads.error ? t.leads : t.leads.map(l => [l.company, <a key="e" href={`mailto:${l.email}`} style={{ color: C.green }}>{l.email}</a>, fmtDate(l.created_at)])}
          empty="Nadie ha llenado el formulario todavía." />
      </Card>
    </div>
  );
}

function ReportsTab({ t }) {
  return (
    <Card title="Reportes y bloqueos del chat">
      <Table head={["Tipo", "Quién reporta", "Reportado", "Quiniela", "Motivo", "Fecha"]}
        rows={t.reports.error ? t.reports : t.reports.map(r => [
          <Pill key="k" color={r.kind === "block" ? C.amber : C.red}>{r.kind === "block" ? "Bloqueo" : "Reporte"}</Pill>,
          r.reporter, r.reported || "—", r.quiniela || "—", r.reason || "—", fmtDate(r.created_at)])}
        empty="Sin reportes. 🙌" />
    </Card>
  );
}

// ---------- shell ----------
const TABS = [
  ["live", "En vivo"], ["torneos", "Torneos"], ["global", "Quiniela Global"], ["partidos", "Marcadores"],
  ["usuarios", "Usuarios y quinielas"], ["ads", "Publicidad"], ["reportes", "Reportes"],
];

export default function AdminClient({ email }) {
  const [tab, setTab] = useState("live");
  const [tables, reloadTables] = useTables();
  useEffect(() => {
    try { const s = sessionStorage.getItem("qa_admin_tab"); if (s) setTab(s); } catch {}
  }, []);
  const go = (t) => { setTab(t); try { sessionStorage.setItem("qa_admin_tab", t); } catch {} };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: "var(--font-display), system-ui, sans-serif" }}>
      <style>{`
        @keyframes qa-ping { 0% { box-shadow: 0 0 0 0 ${C.green}99; } 100% { box-shadow: 0 0 0 10px ${C.green}00; } }
        .qa-pulse { animation: qa-ping 1.4s ease-out infinite; }
        @media (max-width: 900px) { .qa-two { grid-template-columns: 1fr !important; } }
        select option { background: ${C.bg}; }
      `}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 5, background: `${C.bg}f2`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "14px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: C.greenSoft, border: `1.5px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.green, fontWeight: 800 }}>Q</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Quinielapp · Panel del equipo</div>
                <div style={{ color: C.dim, fontSize: 11.5 }}>{email}</div>
              </div>
            </div>
            <a href="/" style={{ color: C.green, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>Abrir la app →</a>
          </div>
          <nav style={{ display: "flex", gap: 4, marginTop: 12, overflowX: "auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} style={{
                background: "none", border: "none", borderBottom: `2px solid ${tab === id ? C.green : "transparent"}`,
                color: tab === id ? C.cream : C.dim, fontWeight: tab === id ? 700 : 500, fontSize: 13,
                padding: "10px 12px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              }}>{label}</button>
            ))}
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: 24 }}>
        {tab === "live" && <LiveTab />}
        {tab === "torneos" && <TournamentsTab />}
        {tab === "global" && <DrawsTab />}
        {tab === "partidos" && <GamesTab />}
        {["usuarios", "ads", "reportes"].includes(tab) && (
          !tables ? <div style={{ color: C.dim }}>Cargando...</div> : tables.error ? <div style={{ color: C.red }}>{tables.error}</div> : (
            <>
              {tab === "usuarios" && <UsersTab t={tables} />}
              {tab === "ads" && <AdsTab t={tables} reload={reloadTables} />}
              {tab === "reportes" && <ReportsTab t={tables} />}
            </>
          )
        )}
      </main>
    </div>
  );
}
