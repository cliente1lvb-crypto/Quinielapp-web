import Providers from "./providers";

import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

// Space Grotesk: geométrica, angulosa, con carácter — es la que le da el aire
// "de laboratorio tech" a toda la interfaz (títulos, botones, texto normal).
// JetBrains Mono: monoespaciada pero mucho más pulida que Courier New — se usa
// solo donde antes iba Courier New (marcadores, números de sorteo, aciertos).
// Space Grotesk solo viene en 300/400/500/700 — la app pide 600/800/900 en
// varios lados (JS los clampa al peso cargado más cercano, que es 700; se ve
// bien igual, pero si algún texto se ve "menos grueso" de lo esperado es por
// esto). 700 cubre 600-900 sin que el navegador sintetice un bold falso.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-display",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Quinielapp",
  description: "Quinielas deportivas con amigos, ranking global y torneos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body style={{ margin: 0, padding: 0, background: "#050d09" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
