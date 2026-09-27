import { sql } from "../../../lib/db";
import bcrypt from "bcryptjs";

// POST /api/users — registro (nombre, correo, fecha de nacimiento, contraseña),
// tal como quedó definido el formulario de registro en la pantalla de login.
export async function POST(req) {
  const { name, email, birthdate, password } = await req.json();

  if (!name || !email || !birthdate || !password) {
    return Response.json(
      { ok: false, error: "Faltan campos: nombre, correo, fecha de nacimiento y contraseña." },
      { status: 400 }
    );
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const rows = await sql(
      `insert into users (name, email, password_hash, birthdate)
       values ($1, $2, $3, $4)
       returning id, name, email, plan, created_at`,
      [name, email, password_hash, birthdate]
    );
    return Response.json({ ok: true, user: rows[0] });
  } catch (err) {
    // 23505 = violación de unique (correo ya registrado)
    if (err.code === "23505") {
      return Response.json({ ok: false, error: "Ese correo ya tiene una cuenta." }, { status: 409 });
    }
    return Response.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}

// GET /api/users — lista básica (solo para pruebas en desarrollo; en producción
// esto necesita autenticación/autorización antes de exponer nada).
export async function GET() {
  const rows = await sql("select id, name, email, plan, created_at from users order by created_at desc limit 50");
  return Response.json({ ok: true, users: rows });
}
