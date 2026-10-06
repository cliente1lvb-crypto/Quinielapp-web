// Textos legales de Quinielapp. Se usan en las páginas públicas /privacidad,
// /terminos y /eliminar-datos y en la ventana "Aviso de privacidad / Términos"
// dentro de la app. Para cambiar el correo de contacto, edita CONTACT_EMAIL.
//
// Nota: es una versión inicial redactada para una plataforma gratuita de
// quinielas por diversión (sin dinero). Antes de crecer o de cobrar algo,
// conviene que un abogado la revise y complete los datos del responsable.

export const CONTACT_EMAIL = "mlvbstudios@gmail.com";
export const SITE_URL = "https://quinielapp-web.vercel.app";
export const LAST_UPDATE = "6 de octubre de 2026";

export const PRIVACY = {
  slug: "privacidad",
  title: "Aviso de privacidad",
  intro: "En Quinielapp cuidamos tu información. Este aviso explica qué datos personales usamos, para qué, con quién los compartimos y cómo puedes ejercer tus derechos. Quinielapp es una plataforma gratuita para jugar quinielas deportivas por diversión con tus amigos: no manejamos dinero, no aceptamos apuestas y no pedimos datos bancarios.",
  sections: [
    ["1. Quién es responsable de tus datos",
      `El equipo de Quinielapp es responsable del tratamiento de tus datos personales. Para cualquier duda o solicitud relacionada con tu privacidad puedes escribirnos a ${CONTACT_EMAIL}.`],
    ["2. Qué datos recopilamos",
      [
        "Datos de cuenta: nombre, correo electrónico, fecha de nacimiento y contraseña (la guardamos cifrada; nunca la vemos en texto plano).",
        "Si entras con Google o Facebook: nombre, correo y foto de perfil que esas plataformas comparten con tu permiso. No recibimos tu contraseña de esas cuentas ni tu lista de amigos.",
        "Datos de uso del juego: quinielas que creas o a las que te unes, partidos elegidos, pronósticos, puntos, boletos de la Quiniela Global, mensajes y stickers del chat, y avatar.",
        "Reportes y bloqueos que hagas sobre otros usuarios.",
        "Notificaciones: si las activas, guardamos un identificador técnico de tu navegador o celular para poder enviarte avisos.",
        "Si nos contactas para anunciarte: nombre de la empresa y correo de contacto.",
        "Datos técnicos mínimos para que el servicio funcione y sea seguro: cookie de sesión, dirección IP y registros del servidor.",
      ]],
    ["3. Datos que NO recopilamos",
      "No pedimos ni guardamos datos bancarios, de tarjetas ni de pagos; no recopilamos datos sensibles (salud, religión, origen étnico, etc.); no accedemos a tus contactos sin que tú los elijas; y no usamos tu ubicación."],
    ["4. Para qué usamos tus datos",
      [
        "Crear y administrar tu cuenta e iniciar sesión.",
        "Que puedas crear quinielas, invitar amigos, pronosticar, ver la tabla de posiciones y platicar en el chat.",
        "Calcular puntos y mostrar rankings (en las quinielas privadas solo los ven sus miembros; en la Quiniela Global se muestran tu nombre, avatar y aciertos).",
        "Enviarte avisos que tú activaste: recordatorios antes de un partido, resultados, nuevos miembros y mensajes.",
        "Verificar que eres mayor de edad.",
        "Mantener la plataforma segura: atender reportes, prevenir abusos y corregir errores.",
      ]],
    ["5. Con quién compartimos tus datos",
      [
        "Con otros usuarios, solo lo necesario para jugar: tu nombre, avatar, puntos y mensajes, dentro de las quinielas en las que participas.",
        "Con proveedores que nos ayudan a operar el servicio y que solo pueden usar los datos para ese fin: Vercel (hospedaje del sitio), Neon (base de datos), Google y Facebook (solo si eliges entrar con ellos) y los servicios de notificaciones de tu navegador (Google, Apple o Mozilla). Algunos de estos proveedores están fuera de México.",
        "Con autoridades, únicamente cuando la ley nos obligue.",
        "No vendemos ni rentamos tus datos personales, y no los compartimos con anunciantes.",
      ]],
    ["6. Cookies y almacenamiento en tu navegador",
      "Usamos una cookie de sesión para mantenerte conectado y el almacenamiento local de tu navegador para recordar preferencias como el modo claro u oscuro. No usamos cookies de publicidad ni de rastreo de terceros."],
    ["7. Cuánto tiempo guardamos tus datos",
      "Mientras tengas una cuenta activa. Si eliminas tu cuenta, borramos tu perfil, tus quinielas, pronósticos, mensajes y suscripciones de notificaciones. Algunas copias de respaldo técnicas pueden tardar unos días en sobrescribirse."],
    ["8. Tus derechos (ARCO)",
      `Puedes acceder a tus datos, corregirlos, cancelarlos (eliminarlos) u oponerte a su uso. Muchos de estos cambios los puedes hacer tú mismo en Perfil → Ajustes (editar tus datos o eliminar tu cuenta). Para cualquier otra solicitud escríbenos a ${CONTACT_EMAIL} indicando tu nombre, el correo de tu cuenta y lo que necesitas; te responderemos en un plazo máximo de 20 días hábiles. También puedes retirar en cualquier momento el permiso de notificaciones desde Ajustes o desde tu navegador.`],
    ["9. Menores de edad",
      "Quinielapp es solo para mayores de 18 años. No creamos cuentas de menores; si detectamos una, la eliminamos."],
    ["10. Seguridad",
      "Usamos conexiones cifradas (HTTPS), contraseñas cifradas y accesos restringidos a la base de datos. Ningún sistema es 100% infalible; si detectamos un incidente que afecte tus datos, te lo informaremos."],
    ["11. Cambios a este aviso",
      "Si cambiamos este aviso te lo haremos saber dentro de la app. La fecha de la última actualización aparece al inicio de esta página."],
  ],
};

export const TERMS = {
  slug: "terminos",
  title: "Términos y condiciones",
  intro: "Estos términos explican las reglas para usar Quinielapp. Al crear una cuenta o usar la plataforma aceptas estos términos. Si no estás de acuerdo, por favor no la uses.",
  sections: [
    ["1. Qué es Quinielapp",
      "Quinielapp es una plataforma gratuita de entretenimiento para jugar quinielas deportivas con amigos: creas una quiniela privada, invitas a tu banda, cada quien pronostica marcadores y la app lleva la tabla de puntos. También hay una Quiniela Global y torneos para competir por diversión."],
    ["2. No es un juego de apuestas",
      [
        "Quinielapp no es una casa de apuestas ni un sorteo: no se cobra por participar, no se reciben apuestas y no se pagan premios en dinero.",
        "Los puntos, posiciones y rankings no tienen valor económico y no se pueden cambiar por dinero ni por bienes.",
        "Está prohibido usar Quinielapp para organizar apuestas o juntar dinero entre usuarios. Cualquier acuerdo que hagas con otras personas fuera de la plataforma es tu responsabilidad; Quinielapp no participa, no lo administra ni responde por él.",
      ]],
    ["3. Quién puede usarla",
      "Debes tener 18 años o más y dar información verdadera al registrarte. Tu cuenta es personal: cuida tu contraseña y avísanos si crees que alguien más la está usando."],
    ["4. Cómo funciona el juego",
      [
        "Puntos: 5 por acertar el marcador exacto, 3 por acertar el resultado (quién gana o si empatan) y 0 si fallas.",
        "Los pronósticos se cierran 3 minutos antes del inicio de cada partido; después ya no se pueden registrar ni cambiar.",
        "Quien crea una quiniela puede invitar o sacar miembros y agregar o quitar partidos que aún no empiezan.",
        "Los horarios, partidos y marcadores provienen de fuentes de datos deportivos de terceros y pueden tener errores o retrasos. Si un resultado se corrige, los puntos se recalculan. Si un partido se cancela o se pospone, puede quedar sin puntos.",
      ]],
    ["5. Reglas de convivencia",
      [
        "Trata con respeto a los demás. No publiques en el chat contenido ofensivo, discriminatorio, violento, sexual, ilegal, spam o datos personales de otras personas.",
        "No intentes hacer trampa, alterar resultados, entrar a cuentas ajenas ni dañar el funcionamiento de la plataforma.",
        "Puedes reportar o bloquear a otros usuarios desde el chat. Podemos borrar contenido y suspender o eliminar cuentas que no cumplan estas reglas.",
      ]],
    ["6. Tu contenido",
      "Los mensajes, nombres de quinielas y demás contenido que publiques son tuyos. Nos das permiso de mostrarlos dentro de la plataforma a las personas con quienes juegas, solo para que el servicio funcione."],
    ["7. Marcas y nombres de equipos",
      "Los nombres de ligas, clubes y competencias pertenecen a sus respectivos dueños y se usan solo para identificar los partidos. Quinielapp no está afiliada, patrocinada ni respaldada por ninguna liga, club o federación."],
    ["8. Funciones de pago",
      "Hoy Quinielapp es gratuita. Si en el futuro ofrecemos funciones de pago (por ejemplo, un plan Premium), te lo diremos con anticipación, con su precio y condiciones, y nunca se tratará de apuestas."],
    ["9. Disponibilidad y responsabilidad",
      "Hacemos lo posible para que la plataforma funcione bien, pero se ofrece \"tal cual\": puede haber interrupciones, errores o cambios. En la medida que la ley lo permita, no somos responsables por daños derivados del uso de la plataforma o de la información deportiva mostrada."],
    ["10. Cancelación",
      "Puedes eliminar tu cuenta cuando quieras desde Perfil → Ajustes. También podemos suspender o cancelar cuentas que incumplan estos términos."],
    ["11. Cambios a estos términos",
      "Podemos actualizar estos términos; te avisaremos dentro de la app. Si sigues usando Quinielapp después del cambio, se entiende que aceptas la nueva versión."],
    ["12. Ley aplicable y contacto",
      `Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier duda escríbenos a ${CONTACT_EMAIL}.`],
  ],
};

export const DELETION = {
  slug: "eliminar-datos",
  title: "Eliminar tu cuenta y tus datos",
  intro: "Puedes borrar tu cuenta de Quinielapp y todos tus datos cuando quieras. Así se hace:",
  sections: [
    ["Opción 1: desde la app (inmediato)",
      [
        "Inicia sesión en Quinielapp.",
        "Ve a Perfil → Ajustes.",
        "Toca \"Eliminar cuenta\" y confirma.",
      ]],
    ["Opción 2: por correo",
      `Escríbenos a ${CONTACT_EMAIL} desde el correo de tu cuenta con el asunto "Eliminar mi cuenta". La borraremos en un máximo de 20 días hábiles y te confirmaremos por correo.`],
    ["Si entraste con Facebook",
      "Además de lo anterior, puedes quitar el acceso de Quinielapp a tu cuenta de Facebook en Facebook → Configuración y privacidad → Configuración → Apps y sitios web → Quinielapp → Eliminar. Si entraste con Google, puedes hacerlo en myaccount.google.com → Seguridad → Tus conexiones con apps y servicios de terceros."],
    ["Qué se borra",
      "Tu perfil (nombre, correo, fecha de nacimiento, foto y contraseña), las quinielas que creaste, tus membresías, pronósticos, boletos de la Quiniela Global, mensajes del chat, notificaciones y suscripciones a avisos. Algunas copias de respaldo técnicas pueden tardar unos días en sobrescribirse."],
  ],
};

export const LEGAL_DOCS = { privacy: PRIVACY, terms: TERMS, deletion: DELETION };
