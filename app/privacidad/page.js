import LegalPage from "../../components/LegalPage";
import { PRIVACY } from "../../lib/legal";

export const metadata = { title: "Aviso de privacidad · Quinielapp", description: "Cómo Quinielapp usa y protege tus datos personales." };

export default function Page() {
  return <LegalPage doc={PRIVACY} others={[["/terminos", "Términos y condiciones"], ["/eliminar-datos", "Eliminar mi cuenta y datos"]]} />;
}
