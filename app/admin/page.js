import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/authOptions";
import AdminClient from "./AdminClient";

// Panel interno del equipo. La verificación de acceso vive aquí (servidor) y
// también en cada ruta /api/admin/* — nadie fuera de ADMIN_EMAILS ve ni toca nada.
export const dynamic = "force-dynamic";

const C = { bg: "#0A0D0B", card: "#151916", line: "#2A302B", green: "#2BE87A", cream: "#F2F5F2", dim: "#8C958E" };

function Notice({ title, text }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "var(--font-display), system-ui, sans-serif" }}>
      <div style={{ maxWidth: 440, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 28, textAlign: "center" }}>
        <div style={{ color: C.green, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Quinielapp · Admin</div>
        <div style={{ color: C.cream, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ color: C.dim, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>{text}</div>
        <a href="/" style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>Ir a Quinielapp →</a>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const email = session?.user?.email?.toLowerCase();

  if (!session) {
    return <Notice title="Necesitas iniciar sesión" text="Entra a Quinielapp con tu cuenta (Google, Facebook o correo) y vuelve a /admin." />;
  }
  if (!admins.length) {
    return <Notice title="Falta configurar ADMIN_EMAILS" text="En Vercel → Settings → Environment Variables agrega ADMIN_EMAILS con tu correo y haz Redeploy." />;
  }
  if (!admins.includes(email)) {
    return <Notice title="No autorizado" text={`Tu cuenta (${session.user.email}) no está en ADMIN_EMAILS.`} />;
  }
  return <AdminClient email={session.user.email} />;
}
