import LegalPage from "../../components/LegalPage";
import { TERMS } from "../../lib/legal";

export const metadata = { title: "Términos y condiciones · Quinielapp", description: "Reglas para usar Quinielapp, la plataforma gratuita de quinielas con amigos." };

export default function Page() {
  return <LegalPage doc={TERMS} others={[["/privacidad", "Aviso de privacidad"], ["/eliminar-datos", "Eliminar mi cuenta y datos"]]} />;
}
