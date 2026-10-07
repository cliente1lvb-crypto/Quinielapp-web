import Providers from "./providers";

import { Anton, Inter_Tight, Oswald } from "next/font/google";

// Identidad tipográfica "Estadio nocturno":
// - Anton: condensada y pesada, para titulares grandes (estilo marcador / cartel deportivo).
// - Oswald: condensada legible, para números (marcadores, cuentas regresivas, puntos).
// - Inter Tight: texto de interfaz, limpia y compacta.
const anton = Anton({ subsets: ["latin"], weight: ["400"], variable: "--font-head", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-mono", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata = {
  title: "Quinielapp",
  description: "Quinielas deportivas con amigos, ranking global y torneos.",
  manifest: "/manifest.webmanifest",
  applicationName: "Quinielapp",
  appleWebApp: { capable: true, title: "Quinielapp", statusBarStyle: "black-translucent" },
  // Favicon: .ico para todos los navegadores (incluido Safari) + SVG nítido para los que lo soportan.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
  // Verificación de propiedad del sitio en Google Search Console (variable en Vercel).
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() } } : {}),
};

export const viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Paleta: negro/blanco con un único acento verde. Modo oscuro y claro.
const THEME_CSS = `
*, *::before, *::after { box-sizing: border-box; }
:root, :root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0A0A0A; --surface: #141414; --surface-2: #1C1C1C; --line: #262626; --line-strong: #3A3A3A;
  --ink: #F5F5F4; --ink-dim: #8F8F8C; --tint: rgba(255,255,255,.05); --tint-2: rgba(255,255,255,.09);
  --accent: #22C55E; --accent-text: #4ADE80; --accent-soft: rgba(34,197,94,.12); --accent-line: rgba(34,197,94,.45); --accent-glow: rgba(34,197,94,.28);
  --on-accent: #0A0A0A; --chip: #EDEDEA; --live: #FF2D2D; --live-soft: rgba(255,45,45,.14);
  --hero: #161616; --glass: rgba(20,20,20,.78); --glass-strong: rgba(20,20,20,.94);
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #F4F4F2; --surface: #FFFFFF; --surface-2: #EFEFEC; --line: #E2E2DE; --line-strong: #CFCFCA;
  --ink: #0A0A0A; --ink-dim: #6B6B67; --tint: rgba(0,0,0,.035); --tint-2: rgba(0,0,0,.07);
  --accent: #16A34A; --accent-text: #15803D; --accent-soft: rgba(34,197,94,.10); --accent-line: rgba(34,197,94,.45); --accent-glow: rgba(34,197,94,.22);
  --on-accent: #0A0A0A; --chip: #E6E6E2; --live: #E5191B; --live-soft: rgba(229,25,27,.10);
  --hero: #0A0A0A; --glass: rgba(255,255,255,.82); --glass-strong: rgba(255,255,255,.95);
}
html, body { background: var(--bg); color: var(--ink); }
body { margin: 0; padding: 0; font-family: var(--font-display), system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
/* En escritorio las hojas inferiores (crear quiniela, etc.) llenan la ventana modal en vez de dejar un hueco arriba. */
.qv-desk-modal > div[style*="align-items: flex-end"] { align-items: stretch !important; background: transparent !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
.qv-desk-modal > div[style*="align-items: flex-end"] > div { max-height: none !important; border-radius: 0 !important; border-top: none !important; }
.qv-sidebar > * { flex-shrink: 0; }
.qv-head { font-family: var(--font-head), Impact, sans-serif !important; font-weight: 400 !important; text-transform: uppercase; letter-spacing: .01em !important; line-height: 1.02 !important; }
`;

// Se ejecuta antes de pintar para que no "parpadee" el tema equivocado.
const NO_FLASH = `try{var t=localStorage.getItem("qa-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning className={`${anton.variable} ${oswald.variable} ${interTight.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
