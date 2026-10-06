import { getServerSession } from "next-auth";
import { authOptions } from "../lib/authOptions";
import MiQuinielaApp from "./QuinielappClient";
import PublicIntro from "../components/PublicIntro";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Sin sesión: debajo del login va una descripción pública de la app (la
  // leen Google, Facebook y los buscadores, que no ejecutan el login).
  let session = null;
  try { session = await getServerSession(authOptions); } catch (e) {}
  return (
    <>
      <MiQuinielaApp />
      {!session && <PublicIntro />}
    </>
  );
}
