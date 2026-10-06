import Link from "next/link";
import { LAST_UPDATE, CONTACT_EMAIL } from "../lib/legal";

// Página legal pública (sin necesidad de iniciar sesión). Usa los colores del
// tema (modo claro/oscuro) definidos en app/layout.js.
export default function LegalPage({ doc, others = [] }) {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", padding: "0 16px 64px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "22px 0", borderBottom: "1px solid var(--line)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
            <img src="/icon-192.png" alt="" width={36} height={36} style={{ borderRadius: 10 }} />
            <span style={{ fontWeight: 800, fontSize: 17 }}>Quinielapp</span>
          </Link>
          <Link href="/" style={{ textDecoration: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 13, padding: "9px 14px", borderRadius: 10 }}>Ir a la app →</Link>
        </header>

        <h1 className="qv-head" style={{ fontSize: "clamp(34px, 7vw, 56px)", margin: "36px 0 8px" }}>{doc.title}</h1>
        <div style={{ color: "var(--ink-dim)", fontSize: 13, marginBottom: 22 }}>Última actualización: {LAST_UPDATE}</div>
        <p style={{ fontSize: 16, lineHeight: 1.65, margin: "0 0 28px" }}>{doc.intro}</p>

        {doc.sections.map(([h, body]) => (
          <section key={h} style={{ padding: "20px 0", borderTop: "1px solid var(--line)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px" }}>{h}</h2>
            {Array.isArray(body) ? (
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.65, fontSize: 15, color: "var(--ink)" }}>
                {body.map((li, i) => <li key={i} style={{ marginBottom: 6 }}>{li}</li>)}
              </ul>
            ) : (
              <p style={{ margin: 0, lineHeight: 1.65, fontSize: 15 }}>{body}</p>
            )}
          </section>
        ))}

        <footer style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--line)", color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.7 }}>
          <div>¿Dudas? Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent-text)" }}>{CONTACT_EMAIL}</a></div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
            {others.map(([href, label]) => <Link key={href} href={href} style={{ color: "var(--accent-text)" }}>{label}</Link>)}
          </div>
        </footer>
      </div>
    </main>
  );
}
