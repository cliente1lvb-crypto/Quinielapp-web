import Link from "next/link";
import PublicIntro from "../../components/PublicIntro";

export const metadata = { title: "Qué es Quinielapp", description: "Quinielas deportivas gratis con tus amigos, sin dinero y sin apuestas." };

export default function Page() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 16px 36px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
          <img src="/icon-192.png" alt="" width={36} height={36} style={{ borderRadius: 10 }} />
          <span style={{ fontWeight: 800, fontSize: 17 }}>Quinielapp</span>
        </Link>
        <Link href="/" style={{ textDecoration: "none", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 800, fontSize: 13, padding: "9px 14px", borderRadius: 10 }}>Entrar →</Link>
      </header>
      <PublicIntro standalone />
    </main>
  );
}
