// Cliente de base de datos — Neon (Postgres serverless).
// DATABASE_URL se configura como variable de entorno en Vercel (o en .env.local
// en desarrollo). Nunca se hardcodea aquí ni se expone al cliente: este archivo
// solo se importa desde app/api/**/route.js (código de servidor).
//
// La conexión se crea de forma perezosa (al primer uso, no al importar el
// archivo) para que "next build" pueda analizar las rutas de API sin tronar
// cuando todavía no existe DATABASE_URL (por ejemplo, antes de configurarla
// en Vercel por primera vez).
import { neon } from "@neondatabase/serverless";

let _sql = null;

function getClient() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL no está configurada. Ve el README: crea el proyecto en " +
      "Neon, copia la cadena de conexión y agrégala en .env.local (desarrollo) " +
      "o en Project Settings → Environment Variables (Vercel)."
    );
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Se usa exactamente igual que el cliente de neon: sql("select ...", [params])
export const sql = (...args) => getClient()(...args);
