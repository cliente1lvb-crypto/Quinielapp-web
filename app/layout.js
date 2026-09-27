export const metadata = {
  title: "Quinielapp",
  description: "Quinielas deportivas con amigos, ranking global y torneos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: "#050d09" }}>
        {children}
      </body>
    </html>
  );
}
