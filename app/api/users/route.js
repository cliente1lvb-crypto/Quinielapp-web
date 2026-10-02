import { sql } from "../../../lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// POST /api/users — registro con nombre, correo, fecha de nacimiento y contraseña.
export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name || "").trim().slice(0, 60);
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const birthdate = String(b.birthdate || "");

  if (!name || !email || !birthdate || !password) {
    return Response.json({ ok: false, error: "Llena nombre, correo, fecha de nacimiento y contraseña." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "Escribe un correo válido." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  const bd = new Date(birthdate);
  if (isNaN(bd.getTime())) {
    return Response.json({ ok: false, error: "Fecha de nacimiento no válida." }, { status: 400 });
  }
  const age = (Date.now() - bd.getTime()) / (365.25 * 864e5);
  if (age < 18) {
    return Response.json({ ok: false, error: "Debes ser mayor de edad para crear una cuenta." }, { status: 400 });
  }

  try {
    const exists = await sql("select 1 from users where lower(email) = $1", [email]);
    if (exists.length) return Response.json({ ok: false, error: "Ese correo ya tiene una cuenta. Inicia sesión." }, { status: 409 });
    const password_hash = await bcrypt.hash(password, 10);
    const rows = await sql(
      `insert into users (name, email, password_hash, birthdate)
       values ($1, $2, $3, $4)
       returning id, name, email, plan, created_at`,
      [name, email, password_hash, birthdate]
    );
    return Response.json({ ok: true, user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return Response.json({ ok: false, error: "Ese correo ya tiene una cuenta. Inicia sesión." }, { status: 409 });
    }
    return Response.json({ ok: false, error: "No se pudo crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }
}
