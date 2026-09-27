# Quinielapp — versión web

Migración del prototipo de React (antes un artifact de chat) a una app Next.js
real, lista para desplegarse en Vercel con Neon como base de datos.

## Qué incluye esta primera migración

- **`app/QuinielappClient.js`** — el prototipo completo (login, quinielas,
  ranking, torneos, ajustes) portado tal cual, como componente de cliente.
  Sigue usando datos de ejemplo (mock) para todo lo visual.
- **`app/api/health`, `app/api/users`, `app/api/scores`** — las primeras rutas
  de servidor conectadas a Neon de verdad: salud de la conexión, registro de
  usuarios, y lectura/escritura del marcador de partidos (gamescore).
- **`db/schema.sql`** — tablas iniciales: `users`, `leagues`, `gamescore`.
- Todavía **no** conectado a Neon: quinielas privadas, chat, torneos, sorteo
  global. Eso se agrega en la siguiente pasada una vez que esto esté
  desplegado y probado.

## 1. Crear la base de datos en Neon

1. Entra a [neon.tech](https://neon.tech) y crea una cuenta (tiene capa
   gratuita, alcanza de sobra para esta primera prueba).
2. Crea un proyecto nuevo — el nombre no importa, ej. `quinielapp`.
3. En el dashboard del proyecto, copia la **Connection string** (empieza con
   `postgresql://...`).

## 2. Configurar el proyecto en local

```bash
npm install
cp .env.example .env.local
```

Pega la cadena de conexión de Neon en `.env.local`:

```
DATABASE_URL=postgresql://usuario:password@host/basededatos?sslmode=require
```

## 3. Crear las tablas

```bash
npm run db:migrate
```

Esto corre `db/schema.sql` contra tu base de Neon y crea `users`, `leagues`
y `gamescore` (con las 6 ligas ya precargadas).

## 4. Probar en local

```bash
npm run dev
```

Abre `http://localhost:3000` — deberías ver la app completa. Para confirmar
que Neon responde, abre `http://localhost:3000/api/health` — si ves
`{ "ok": true, "server_time": ... }`, la conexión quedó bien.

## 5. Subir a Vercel

La ruta más simple sin repositorio en GitHub todavía:

```bash
npm install -g vercel
vercel login
vercel
```

Sigue las preguntas (acepta los defaults de un proyecto Next.js). Cuando
pregunte por variables de entorno, o después desde el dashboard de Vercel en
**Project Settings → Environment Variables**, agrega:

```
DATABASE_URL = (la misma cadena de conexión de Neon)
```

Luego:

```bash
vercel --prod
```

Vercel te da una URL tipo `quinielapp-web-xxxx.vercel.app` — como dijiste, sin
dominio propio por ahora, esa URL sirve perfecto para las pruebas.

### Si prefieres conectar GitHub en vez de la CLI

1. Sube este proyecto a un repositorio (puede ser privado).
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el
   repositorio.
3. Vercel detecta Next.js automáticamente. Antes de darle "Deploy", agrega la
   variable `DATABASE_URL` en la sección de Environment Variables.
4. Cada vez que subas un cambio a la rama principal, Vercel vuelve a
   desplegar solo.

## 6. Verificar que quedó conectado de punta a punta

- `GET /api/health` → confirma Neon.
- `POST /api/users` con `{ "name", "email", "birthdate", "password" }` →
  crea un usuario real en la tabla `users` (la contraseña se guarda con
  bcrypt, nunca en texto plano).
- `GET /api/scores` → lee el marcador (vacío al principio, hasta que algo
  escriba en `gamescore` — ya sea a mano con `POST /api/scores`, o después el
  job que sincronice con API-Football).

## 7. Login con Google y Facebook (NextAuth)

Ya está conectado de verdad: registro/login por correo contra Neon (bcrypt),
más botones de Google y Facebook. Falta darle sus llaves a cada proveedor.

### Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Pégalo en `.env.local` como `NEXTAUTH_SECRET` (y luego en Vercel también).

### Google

1. [console.cloud.google.com](https://console.cloud.google.com) → crea un
   proyecto (o usa uno existente).
2. **APIs & Services → OAuth consent screen** → configúralo en modo
   "External", agrega tu correo como usuario de prueba mientras no esté
   publicado.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → tipo "Web application".
4. En **Authorized redirect URIs** agrega:
   - `http://localhost:3000/api/auth/callback/google` (para probar en local)
   - `https://TU-URL-DE-VERCEL.vercel.app/api/auth/callback/google`
5. Copia el **Client ID** y **Client Secret** a `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.

### Facebook

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps →
   Create App** → tipo "Consumer".
2. Agrega el producto **Facebook Login** → Settings.
3. En **Valid OAuth Redirect URIs** agrega:
   - `http://localhost:3000/api/auth/callback/facebook`
   - `https://TU-URL-DE-VERCEL.vercel.app/api/auth/callback/facebook`
4. En **App Settings → Basic**, copia el **App ID** y **App Secret** a
   `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`.
5. Mientras la app esté en modo "Development", solo tú y los usuarios que
   agregues como "Testers" van a poder entrar con Facebook — es justo lo que
   quieres mientras solo pruebas en Vercel sin dominio propio.

### En Vercel

Agrega las 6 variables (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`,
`FACEBOOK_CLIENT_SECRET`) en **Project Settings → Environment Variables**,
y vuelve a desplegar (`vercel --prod`) para que tomen efecto.

⚠️ Cada vez que Vercel te dé una URL nueva (pasa si borras y recreas el
proyecto), tienes que actualizar `NEXTAUTH_URL` y las Redirect URIs de Google
y Facebook con esa URL nueva — si no, el login por Google/Facebook falla con
un error de "redirect_uri_mismatch".

## Siguientes pasos (no incluidos todavía)

- Endpoint para eliminar cuenta de verdad (`DELETE /api/users`) — hoy el botón
  de "Eliminar cuenta" cierra sesión pero no borra la fila en Neon.
- Tablas y endpoints para quinielas privadas, miembros, chat y torneos.
- Job programado (Vercel Cron o similar) que sincronice `gamescore` con
  API-Football cada 15 segundos mientras haya partidos en vivo.
- Recuperar contraseña ("¿Olvidaste tu contraseña?" es todavía solo visual).
