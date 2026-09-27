import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/authOptions";
import { sql } from "../../lib/db";

// Nunca cachear este panel — los números deben ser los de ahora mismo.
export const dynamic = "force-dynamic";

const C = {
  bg: "#0A0D0B", card: "#151916", line: "#2A302B",
  green: "#2BE87A", greenSoft: "#2BE87A22", cream: "#F2F5F2", dim: "#8C958E", red: "#FF3B3B",
};

// Cada bloque de datos se consulta por separado y con su propio try/catch:
// si una tabla no existe todavía (por ejemplo, no has corrido db:migrate) o
// no hay DATABASE_URL, ese bloque se muestra como "no disponible" en vez de
// tumbar el panel completo.
async function safeQuery(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    return { error: String(err.message || err), data: fallback };
  }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = session?.user?.email && adminEmails.includes(session.user.email.toLowerCase());

  if (!session) {
    return (
      <Shell>
        <Notice title="Necesitas iniciar sesión" text="Entra a Quinielapp normal (con tu cuenta de Google, Facebook o correo) y vuelve a /admin." />
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <Notice
          title="No autorizado"
          text={`Tu cuenta (${session.user.email}) no está en la lista de administradores. Pídele a quien administre el proyecto que agregue tu correo a ADMIN_EMAILS en Vercel.`}
        />
      </Shell>
    );
  }

  // ---------- Usuarios ----------
  const usersReport = await safeQuery(async () => {
    const totals = await sql("select count(*)::int as total from users");
    const byPlan = await sql("select plan, count(*)::int as total from users group by plan");
    const byProvider = await sql(
      "select coalesce(oauth_provider, 'correo') as provider, count(*)::int as total from users group by oauth_provider"
    );
    const recent = await sql(
      "select name, email, plan, oauth_provider, created_at from users order by created_at desc limit 10"
    );
    return { totals: totals[0], byPlan, byProvider, recent };
  }, null);

  // ---------- Marcador (gamescore) ----------
  const scoresReport = await safeQuery(async () => {
    const totals = await sql("select count(*)::int as total from gamescore");
    const byStatus = await sql("select status, count(*)::int as total from gamescore group by status");
    const byLeague = await sql(
      `select l.name as league, count(*)::int as total
       from gamescore g join leagues l on l.id = g.league_id
       group by l.name order by total desc`
    );
    const recent = await sql(
      `select g.home_team, g.away_team, g.home_score, g.away_score, g.status, g.updated_at, l.name as league
       from gamescore g join leagues l on l.id = g.league_id
       order by g.updated_at desc limit 10`
    );
    return { totals: totals[0], byStatus, byLeague, recent };
  }, null);

  // ---------- Publicidad ----------
  const adsReport = await safeQuery(async () => {
    const rows = await sql(
      "select advertiser, placement, active, impressions, clicks, created_at from ads order by created_at desc"
    );
    const totals = rows.reduce(
      (acc, r) => ({ impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks }),
      { impressions: 0, clicks: 0 }
    );
    return { rows, totals };
  }, null);

  return (
    <Shell adminEmail={session.user.email}>
      <Section title="Usuarios" report={usersReport}>
        {(d) => (
          <>
            <StatRow>
              <Stat label="Total registrados" value={d.totals.total} />
              {d.byPlan.map((p) => (
                <Stat key={p.plan} label={`Plan ${p.plan}`} value={p.total} />
              ))}
            </StatRow>
            <StatRow>
              {d.byProvider.map((p) => (
                <Stat key={p.provider} label={`Vía ${p.provider}`} value={p.total} small />
              ))}
            </StatRow>
            <Table
              head={["Nombre", "Correo", "Plan", "Origen", "Registrado"]}
              rows={d.recent.map((u) => [u.name, u.email, u.plan, u.oauth_provider || "correo", fmtDate(u.created_at)])}
              empty="Todavía no hay usuarios registrados."
            />
          </>
        )}
      </Section>

      <Section title="Marcador de partidos (gamescore)" report={scoresReport}>
        {(d) => (
          <>
            <StatRow>
              <Stat label="Partidos sincronizados" value={d.totals.total} />
              {d.byStatus.map((s) => (
                <Stat key={s.status} label={s.status} value={s.total} />
              ))}
            </StatRow>
            {d.byLeague.length > 0 && (
              <StatRow>
                {d.byLeague.map((l) => (
                  <Stat key={l.league} label={l.league} value={l.total} small />
                ))}
              </StatRow>
            )}
            <Table
              head={["Partido", "Marcador", "Liga", "Estado", "Actualizado"]}
              rows={d.recent.map((g) => [
                `${g.home_team} vs ${g.away_team}`,
                g.home_score === null ? "—" : `${g.home_score}-${g.away_score}`,
                g.league, g.status, fmtDate(g.updated_at),
              ])}
              empty="Todavía no hay partidos cargados en gamescore — se llenan al conectar el proveedor de datos deportivos o insertarlos a mano vía POST /api/scores."
            />
          </>
        )}
      </Section>

      <Section title="Publicidad" report={adsReport}>
        {(d) => (
          <>
            <StatRow>
              <Stat label="Impresiones totales" value={d.totals.impressions} />
              <Stat label="Clics totales" value={d.totals.clicks} />
              <Stat
                label="CTR"
                value={d.totals.impressions ? `${((d.totals.clicks / d.totals.impressions) * 100).toFixed(1)}%` : "—"}
              />
            </StatRow>
            <Table
              head={["Anunciante", "Espacio", "Activo", "Impresiones", "Clics", "Alta"]}
              rows={d.rows.map((a) => [
                a.advertiser, a.placement, a.active ? "Sí" : "No", a.impressions, a.clicks, fmtDate(a.created_at),
              ])}
              empty="Todavía no hay ningún anuncio dado de alta — ver README sección Publicidad para POST /api/ads."
            />
          </>
        )}
      </Section>
    </Shell>
  );
}

function Shell({ children, adminEmail }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.cream, fontFamily: "Helvetica, Arial, sans-serif", padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 30 }}>
          <div>
            <div style={{ color: C.green, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Quinielapp</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>Panel interno</h1>
          </div>
          {adminEmail && <div style={{ color: C.dim, fontSize: 12 }}>{adminEmail}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Notice({ title, text }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, maxWidth: 480 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</div>
      <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function Section({ title, report, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14, borderBottom: `1px solid ${C.line}`, paddingBottom: 10 }}>{title}</h2>
      {report?.error ? (
        <div style={{ color: C.red, fontSize: 12.5, background: `${C.red}15`, border: `1px solid ${C.red}55`, borderRadius: 10, padding: 14 }}>
          No se pudo leer: {report.error}
        </div>
      ) : report ? (
        children(report)
      ) : (
        <div style={{ color: C.dim, fontSize: 12.5 }}>Sin datos.</div>
      )}
    </div>
  );
}

function StatRow({ children }) {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>{children}</div>;
}

function Stat({ label, value, small }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
      padding: small ? "10px 14px" : "14px 18px", minWidth: small ? 110 : 140,
    }}>
      <div style={{ fontSize: small ? 18 : 24, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>{value}</div>
      <div style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Table({ head, rows, empty }) {
  if (rows.length === 0) {
    return <div style={{ color: C.dim, fontSize: 12.5, padding: "16px 0" }}>{empty}</div>;
  }
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: C.card }}>
            {head.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: C.dim, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", color: j === 0 ? C.cream : C.dim }}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
