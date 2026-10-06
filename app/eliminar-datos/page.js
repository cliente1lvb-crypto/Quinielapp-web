import LegalPage from "../../components/LegalPage";
import { DELETION } from "../../lib/legal";

export const metadata = { title: "Eliminar cuenta y datos · Quinielapp", description: "Cómo borrar tu cuenta de Quinielapp y todos tus datos." };

export default function Page() {
  return <LegalPage doc={DELETION} others={[["/privacidad", "Aviso de privacidad"], ["/terminos", "Términos y condiciones"]]} />;
}
