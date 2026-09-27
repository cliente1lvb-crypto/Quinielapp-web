// Aplica db/schema.sql contra la base de Neon indicada en DATABASE_URL.
// Uso:  npm run db:migrate
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "Falta DATABASE_URL. Crea un archivo .env.local (ver .env.example) " +
      "o expórtala en tu terminal antes de correr este script."
    );
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  // El driver de Neon ejecuta una sentencia a la vez, así que partimos el
  // archivo por punto y coma. Suficiente para este esquema inicial sencillo.
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Aplicando ${statements.length} sentencias a Neon...`);
  for (const stmt of statements) {
    await sql(stmt);
  }
  console.log("Listo — tablas creadas/actualizadas en Neon.");
}

main().catch((err) => {
  console.error("Error aplicando el esquema:", err);
  process.exit(1);
});
