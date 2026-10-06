import Link from "next/link";
import { CONTACT_EMAIL } from "../lib/legal";

// Descripción pública de Quinielapp (se ve sin iniciar sesión y la leen
// buscadores y los revisores de Google/Facebook). Se usa debajo del login y en /acerca.
export default function PublicIntro({ standalone = false }) {
  const card = { border: "1px solid var(--line)", background: "var(--surface)", borderRadius: 16, padding: 18 };
  const features = [
    ["Quinielas privadas con amigos", "Crea una quiniela, invita hasta 15 amigos con un link o código y elige partidos de las 5 grandes ligas de Europa."],
    ["Pronostica marcadores", "Cada quien registra su marcador hasta 30 minutos antes del partido. 5 puntos por marcador exacto, 3 por acertar el resultado."],
    ["Tabla en tiempo real y chat", "La app calcula los puntos sola, muestra quién va ganando y tiene chat para el cotorreo del grupo."],
    ["Quiniela Global y torneos", "Compite contra más gente en un sorteo semanal de 10 partidos, solo por diversión."],
  ];
  return (
    <section aria-label="Qué es Quinielapp" style={{ position: "relative", zIndex: 5, background: "var(--bg)", color: "var(--ink)", padding: standalone ? "0 16px 64px" : "56px 16px 64px", borderTop: standalone ? "none" : "1px solid var(--line)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1 className="qv-head" style={{ fontSize: "clamp(34px, 6vw, 56px)", margin: "0 0 12px" }}>Quinielapp: quinielas con tus amigos</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, maxWidth: 720, margin: "0 0 10px" }}>
          Quinielapp es una aplicación web gratuita para jugar quinielas deportivas por diversión con tu grupo de amigos.
          Pronostican marcadores, la app lleva los puntos y al final de la jornada se sabe quién sabe más de futbol.
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 720, margin: "0 0 26px", color: "var(--ink-dim)" }}>
          <b style={{ color: "var(--ink)" }}>Sin dinero y sin apuestas:</b> no se cobra por participar, no se aceptan apuestas y no hay premios en efectivo.
          Solo es para mayores de 18 años.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 28 }}>
          {features.map(([t, d]) => (
            <div key={t} style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>{t}</h2>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: "var(--ink-dim)" }}>{d}</p>
            </div>
          ))}
        </div>
        <div style={{ ...card, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>Inicio de sesión con Google o Facebook</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: "var(--ink-dim)" }}>
            Si eliges entrar con Google o Facebook, solo usamos tu nombre, correo y foto de perfil para crear tu cuenta y mostrar tu nombre a tus amigos dentro de tus quinielas.
            No publicamos nada en tu nombre, no leemos tus correos ni tus contactos y no vendemos tus datos. Detalles en el <Link href="/privacidad" style={{ color: "var(--accent-text)" }}>Aviso de privacidad</Link>.
          </p>
        </div>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13.5 }}>
          <Link href="/privacidad" style={{ color: "var(--accent-text)" }}>Aviso de privacidad</Link>
          <Link href="/terminos" style={{ color: "var(--accent-text)" }}>Términos y condiciones</Link>
          <Link href="/eliminar-datos" style={{ color: "var(--accent-text)" }}>Eliminar mi cuenta</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--ink-dim)" }}>{CONTACT_EMAIL}</a>
        </nav>
      </div>
    </section>
  );
}
