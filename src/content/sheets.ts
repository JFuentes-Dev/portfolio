import type { Locale } from "@/i18n/config";
import geometry from "./showcase-geometry.json";

// Mis trabajos: todo lo que he construido. En la landing cada uno es una placa en la pared 3D
// (src/lib/site-builder.ts) y al hacer clic se abre su demo (ProjectDialog).
//
// Hay dos tipos de trabajo:
// - Visual (`pages`): se ve en celular y escritorio con capturas de página completa en
//   /public/prototypes/<slug>/ (desktop.jpg a 1280 px y mobile.jpg a 390 px de ancho). Si la página
//   tiene `liveUrl`, también se puede ver en vivo (iframe).
// - De datos (`table`): qué hago y con qué. Sola, para trabajo que no se ve en una pantalla; junto a
//   `pages` (Sellside), va en la ficha de la demo, al lado de la vista del sitio.
//
// showcase-geometry.json lo genera scripts/capture-showcase.mjs: alto de cada página y dónde empieza
// cada sección en escritorio y en celular. Sirve para sincronizar el scroll sección a sección y para
// ubicar las anotaciones (`section` = índice de la sección en esa lista).
//
// Los sitios hechos para negocios reales que no autorizaron mostrar su marca van ANONIMIZADOS (sin
// nombre, logo, fotos ni contacto del negocio) y sin enlace. Con el nombre real hace falta su permiso
// por escrito: este repo es público y el historial no se borra.

type Text = Record<Locale, string>;

export type PageSlug = keyof typeof geometry;

export type SheetNote = {
  section: number;
  title: Text;
  text: Text;
};

export type SheetPage = {
  slug: PageSlug;
  // Solo hace falta si la hoja tiene más de una variante.
  label?: Text;
  // Sin tipografías = sitio que no diseñé yo (p. ej. el de la empresa donde trabajo): la demo no
  // muestra la ficha de diseño (tipografías y paleta).
  fonts?: [string, string];
  // Fondo, texto, acento, acento 2 (el fondo y el texto se usan mientras carga la captura).
  palette: [string, string, string, string];
  liveUrl?: string;
  // Título de las anotaciones (por defecto, "Decisiones de diseño").
  notesTitle?: Text;
  notes: SheetNote[];
};

export type SheetRow = {
  area: Text;
  detail: Text;
  tools: string;
};

export type Sheet = {
  id: string;
  // Nombre corto de la pestaña.
  tab: Text;
  title: Text;
  // Tipo de proyecto (va sobre el título de la hoja y en el índice).
  kind: Text;
  // Rol y período, si aplica.
  meta?: Text;
  // Resumen bajo el título de la hoja.
  summary: Text;
  // Aclaración sobre la vista previa (p. ej. que es el sitio de la empresa donde trabajo).
  preview?: Text;
  // Color de la pestaña.
  color: string;
  // Sitio publicado.
  url?: string;
  stack: string[];
  pages?: SheetPage[];
  table?: { columns: [Text, Text, Text]; rows: SheetRow[] };
};

export const pageGeometry = geometry;

// thumb.jpg: el primer pantallazo de desktop.jpg (1280×800) a 960×600, para la placa 3D.
export const pageImages = (slug: PageSlug) => ({
  desktop: `/prototypes/${slug}/desktop.jpg`,
  mobile: `/prototypes/${slug}/mobile.jpg`,
  thumb: `/prototypes/${slug}/thumb.jpg`,
});

const webStack = ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Supabase", "Zod"];

export const sheets: Sheet[] = [
  {
    id: "juria",
    tab: { es: "Juria", en: "Juria" },
    title: { es: "Juria", en: "Juria" },
    kind: { es: "Legaltech", en: "Legaltech" },
    meta: { es: "Diseño y desarrollo end-to-end · 2026", en: "End-to-end design & development · 2026" },
    summary: {
      es: "Plataforma de divorcios en línea: evaluación del caso en pocos minutos, precio cerrado y seguimiento desde la cuenta del cliente.",
      en: "Online divorce platform: case assessment in a few minutes, fixed pricing and case tracking from the client's account.",
    },
    color: "oklch(42% 0.085 300)",
    url: "https://www.juria.cl",
    stack: ["Next.js", "TypeScript", "Supabase", "Tailwind CSS"],
    pages: [
      {
        slug: "juria",
        fonts: ["Instrument Sans", "Archivo Black"],
        palette: ["oklch(96.5% 0.008 80)", "oklch(20% 0.012 300)", "oklch(42% 0.085 300)", "oklch(93% 0.018 300)"],
        liveUrl: "https://www.juria.cl",
        notes: [
          {
            section: 0,
            title: { es: "La evaluación empieza en el hero", en: "The assessment starts in the hero" },
            text: {
              es: "En escritorio, las cuatro preguntas están en el primer pantallazo: nadie tiene que buscar un botón.",
              en: "On desktop, the four questions are right above the fold: nobody has to look for a button.",
            },
          },
          {
            section: 1,
            title: { es: "Comparación con un estudio tradicional", en: "Compared with a traditional firm" },
            text: {
              es: "Lado a lado, lo que cambia: precio cerrado antes de firmar, estado del caso a la vista y expediente digital.",
              en: "Side by side, what changes: a fixed price before signing, visible case status and a digital file.",
            },
          },
          {
            section: 4,
            title: { es: "Qué incluye y qué no", en: "What's included and what isn't" },
            text: {
              es: "El precio cerrado detalla lo que incluye y lo que no, como los gastos de terceros. Sin letra chica.",
              en: "The fixed price spells out what it covers and what it doesn't, like third-party costs. No fine print.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "sellside",
    tab: { es: "Sellside", en: "Sellside" },
    title: { es: "Sellside", en: "Sellside" },
    kind: { es: "Odoo developer · ERP", en: "Odoo developer · ERP" },
    meta: {
      es: "Odoo developer · implementación de Odoo ERP · ago. 2025 – hoy",
      en: "Odoo developer · Odoo ERP implementation · Aug 2025 – now",
    },
    summary: {
      es: "Trabajo en Sellside como Odoo developer: implementamos Odoo ERP en empresas de distintos rubros. Adapto Odoo a cada una con módulos a medida, integraciones con otros sistemas y reportes.",
      en: "I work at Sellside as an Odoo developer: we implement Odoo ERP for companies across industries. I adapt Odoo to each one with custom modules, integrations with other systems and reports.",
    },
    preview: {
      es: "La vista es el sitio de Sellside, la empresa donde trabajo.",
      en: "The preview is the website of Sellside, the company I work for.",
    },
    color: "#f39200",
    url: "https://www.sellside.cl",
    stack: ["Odoo 18", "Python", "OWL / JavaScript", "PostgreSQL", "REST API"],
    pages: [
      {
        slug: "sellside",
        palette: ["#ffffff", "#111827", "#f39200", "#000000"],
        liveUrl: "https://www.sellside.cl",
        notesTitle: { es: "Sobre Sellside", en: "About Sellside" },
        notes: [
          {
            section: 3,
            title: { es: "Sistemas de gestión a medida", en: "Custom business management systems" },
            text: {
              es: "Es la línea donde trabajo: adaptar Odoo ERP a cada empresa con módulos, integraciones y reportes.",
              en: "That's the line I work in: adapting Odoo ERP to each company with modules, integrations and reports.",
            },
          },
          {
            section: 5,
            title: { es: "Odoo Ready Partner", en: "Odoo Ready Partner" },
            text: {
              es: "Sellside es partner de Odoo: desde ahí implementamos Odoo ERP para las empresas que lo contratan.",
              en: "Sellside is an Odoo partner: that's how we implement Odoo ERP for the companies that hire us.",
            },
          },
        ],
      },
    ],
    table: {
      columns: [
        { es: "Área", en: "Area" },
        { es: "Qué hago", en: "What I do" },
        { es: "Con qué", en: "With" },
      ],
      rows: [
        {
          area: { es: "Implementación", en: "Implementation" },
          detail: {
            es: "Implemento Odoo ERP en empresas de distintos rubros y lo adapto a sus procesos.",
            en: "I implement Odoo ERP for companies across industries and adapt it to their processes.",
          },
          tools: "Odoo 18",
        },
        {
          area: { es: "Módulos a medida", en: "Custom modules" },
          detail: {
            es: "Desarrollo módulos personalizados en Odoo 18 según el proceso de cada cliente.",
            en: "I build custom Odoo 18 modules around each client's process.",
          },
          tools: "Python · OWL / JavaScript",
        },
        {
          area: { es: "Integraciones", en: "Integrations" },
          detail: {
            es: "Diseño integraciones REST API entre Odoo y otros ERPs.",
            en: "I design REST API integrations between Odoo and other ERPs.",
          },
          tools: "REST API · Python",
        },
        {
          area: { es: "Sincronización", en: "Data sync" },
          detail: {
            es: "Automatizo la sincronización de datos entre sistemas con tareas programadas (cron).",
            en: "I automate data sync between systems with scheduled (cron) jobs.",
          },
          tools: "Odoo cron · PostgreSQL",
        },
        {
          area: { es: "Reportes", en: "Reports" },
          detail: {
            es: "Construyo reportes con lógica de negocio compleja.",
            en: "I build reports with complex business logic.",
          },
          tools: "Python · PostgreSQL",
        },
      ],
    },
  },
  {
    id: "estudio",
    tab: { es: "Estudio web", en: "Web studio" },
    title: { es: "Estudio web", en: "Web studio" },
    kind: { es: "Agencia", en: "Agency" },
    meta: { es: "Mi propio sitio · 3 variantes en vivo", en: "My own site · 3 live variants" },
    summary: {
      es: "El sitio con el que ofrezco mis servicios, diseñado en tres direcciones visuales para probar cuál conecta mejor con cada tipo de cliente.",
      en: "The site I use to sell my services, designed in three visual directions to test which one connects best with each kind of client.",
    },
    color: "oklch(53% 0.14 38)",
    stack: webStack,
    pages: [
      {
        slug: "editorial",
        label: { es: "Editorial cálido", en: "Warm editorial" },
        fonts: ["Fraunces", "Inter"],
        palette: ["oklch(97.2% 0.012 80)", "oklch(23% 0.02 45)", "oklch(53% 0.14 38)", "oklch(48% 0.05 155)"],
        liveUrl: "https://webs-xi-two.vercel.app/disenos/a",
        notes: [
          {
            section: 2,
            title: { es: "Planes comparables", en: "Comparable plans" },
            text: {
              es: "Tres planes lado a lado, con lo que incluye cada uno a la vista: el cliente se ubica solo antes de escribir.",
              en: "Three plans side by side with everything they include: clients place themselves before reaching out.",
            },
          },
          {
            section: 3,
            title: { es: "Proceso en 4 pasos", en: "4-step process" },
            text: {
              es: "Explica qué pasa después de contratar. Baja la ansiedad de quien nunca ha encargado una web.",
              en: "Explains what happens after hiring. Calms people who have never commissioned a website.",
            },
          },
          {
            section: 6,
            title: { es: "Formulario con consentimiento", en: "Form with consent" },
            text: {
              es: "Contacto con consentimiento explícito según la Ley 21.719 de protección de datos.",
              en: "Contact form with explicit consent under Chile's data protection law (21.719).",
            },
          },
        ],
      },
      {
        slug: "tech",
        label: { es: "Tech oscuro", en: "Dark tech" },
        fonts: ["Geist", "Geist Mono"],
        palette: ["oklch(14.5% 0.008 275)", "oklch(97% 0.004 275)", "oklch(91% 0.2 125)", "oklch(68% 0.19 295)"],
        liveUrl: "https://webs-xi-two.vercel.app/disenos/b",
        notes: [
          {
            section: 0,
            title: { es: "Terminal en el hero", en: "Terminal hero" },
            text: {
              es: "Una terminal que “despliega” la web: comunica velocidad y oficio técnico sin una sola palabra de jerga.",
              en: "A terminal that “deploys” the site: conveys speed and craft without any jargon.",
            },
          },
          {
            section: 1,
            title: { es: "Bento de beneficios", en: "Benefits bento" },
            text: {
              es: "Beneficios en bloques de distinto tamaño: el más importante ocupa más espacio y se lee primero.",
              en: "Benefits in blocks of different sizes: the most important one takes more room and is read first.",
            },
          },
          {
            section: 5,
            title: { es: "Preguntas desplegables", en: "Collapsible FAQ" },
            text: {
              es: "Las objeciones típicas (precio, plazos, dominio) resueltas sin alargar la página.",
              en: "Typical objections (price, timing, domain) answered without making the page longer.",
            },
          },
        ],
      },
      {
        slug: "vibrante",
        label: { es: "Pyme vibrante", en: "Vibrant small business" },
        fonts: ["Bricolage Grotesque", "DM Sans"],
        palette: ["oklch(98% 0.018 92)", "oklch(22% 0.04 265)", "oklch(57% 0.2 33)", "oklch(88% 0.16 95)"],
        liveUrl: "https://webs-xi-two.vercel.app/disenos/c",
        notes: [
          {
            section: 0,
            title: { es: "Celular en el hero", en: "Phone in the hero" },
            text: {
              es: "Muestra el resultado donde lo verán sus clientes: en la pantalla de un celular.",
              en: "Shows the result where customers will see it: on a phone screen.",
            },
          },
          {
            section: 2,
            title: { es: "Cotización por WhatsApp", en: "Quotes over WhatsApp" },
            text: {
              es: "La cotización se pide directo por WhatsApp. Para negocios que venden conversando.",
              en: "Quotes are requested straight over WhatsApp. For businesses that sell by chatting.",
            },
          },
          {
            section: 4,
            title: { es: "Contraste AA verificado", en: "Verified AA contrast" },
            text: {
              es: "Colores alegres, pero cada combinación de texto y fondo cumple WCAG AA.",
              en: "Cheerful colors, but every text and background pair meets WCAG AA.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "bar",
    tab: { es: "Bar cervecero", en: "Beer bar" },
    title: { es: "Bar cervecero", en: "Craft beer bar" },
    kind: { es: "Gastronomía", en: "Food & drink" },
    summary: {
      es: "Para un bar que vende por apps de delivery y quiere recuperar pedidos directos y aparecer en Google.",
      en: "For a bar that sells through delivery apps and wants direct orders back and to show up on Google.",
    },
    color: "#7a2e12",
    stack: webStack,
    pages: [
      {
        slug: "bar",
        fonts: ["Bebas Neue", "Work Sans"],
        palette: ["#0c1f16", "#f6efe0", "#e5b84b", "#7a2e12"],
        notes: [
          {
            section: 0,
            title: { es: "Delivery en el primer pantallazo", en: "Delivery above the fold" },
            text: {
              es: "“Ver la carta” y “Pedir” arriba de todo: la mayoría llega con hambre y desde el celular.",
              en: "“See the menu” and “Order” at the very top: most visitors arrive hungry and on their phone.",
            },
          },
          {
            section: 2,
            title: { es: "Carta con buscador y filtros", en: "Menu with search and filters" },
            text: {
              es: "Cambian un precio y queda publicado al tiro, sin reimprimir ni subir otra foto a Instagram.",
              en: "Change a price and it's live instantly, with no reprinting or new Instagram photo.",
            },
          },
          {
            section: 3,
            title: { es: "Promo del día automática", en: "Automatic daily special" },
            text: {
              es: "La página muestra sola la promo que corresponde según el día de la semana.",
              en: "The page shows the right special for each day of the week on its own.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "gimnasio",
    tab: { es: "Gimnasio", en: "Gym" },
    title: { es: "Gimnasio boutique", en: "Boutique gym" },
    kind: { es: "Deporte", en: "Fitness" },
    summary: {
      es: "Para un gimnasio de grupos reducidos: precios claros y la clase de prueba agendada sin coordinar por chat.",
      en: "For a small-group gym: clear pricing and trial classes booked without back-and-forth over chat.",
    },
    color: "#4f5df5",
    stack: webStack,
    pages: [
      {
        slug: "gimnasio",
        fonts: ["Anton", "Barlow"],
        palette: ["#0a0a0b", "#f5f5f5", "#4f5df5", "#ef4444"],
        notes: [
          {
            section: 3,
            title: { es: "Planes y valores a la vista", en: "Plans and prices up front" },
            text: {
              es: "“¿Cuánto sale?” es la pregunta n.º 1 por mensaje. Responderla en la web filtra y acelera la venta.",
              en: "“How much?” is the #1 question in DMs. Answering it on the site filters leads and speeds up sales.",
            },
          },
          {
            section: 4,
            title: { es: "Clase de prueba en 3 pasos", en: "Trial class in 3 steps" },
            text: {
              es: "Disciplina, día y hora: el mensaje llega listo y nadie tiene que coordinar a mano.",
              en: "Discipline, day and time: the message arrives ready and nobody has to coordinate by hand.",
            },
          },
          {
            section: 5,
            title: { es: "Prueba social", en: "Social proof" },
            text: {
              es: "Reseñas cortas justo después de la agenda, cuando la persona duda si inscribirse.",
              en: "Short reviews right after booking, when people are deciding whether to sign up.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "clinica",
    tab: { es: "Clínica dental", en: "Dental clinic" },
    title: { es: "Clínica dental", en: "Dental clinic" },
    kind: { es: "Salud", en: "Healthcare" },
    summary: {
      es: "Para una clínica de barrio: reservar en un minuto y orientar al paciente que no sabe qué tratamiento pedir.",
      en: "For a neighborhood clinic: book in a minute and guide patients who don't know which treatment to ask for.",
    },
    color: "#3b6fb0",
    stack: webStack,
    pages: [
      {
        slug: "clinica",
        fonts: ["Outfit", "Plus Jakarta Sans"],
        palette: ["#f4f8fd", "#0e2a3d", "#3b6fb0", "#0e7490"],
        notes: [
          {
            section: 2,
            title: { es: "Orientador «¿qué te pasa?»", en: "“What's wrong?” guide" },
            text: {
              es: "El paciente elige un síntoma y la página le recomienda qué hora reservar.",
              en: "Patients pick a symptom and the page recommends which appointment to book.",
            },
          },
          {
            section: 4,
            title: { es: "Agenda por tratamiento", en: "Booking by treatment" },
            text: {
              es: "Cada tratamiento con su duración, y la confirmación llega por WhatsApp.",
              en: "Each treatment with its duration, confirmed over WhatsApp.",
            },
          },
          {
            section: 5,
            title: { es: "Consejos que alimentan las redes", en: "Tips that feed social media" },
            text: {
              es: "Artículos cortos que responden lo que más preguntan y se reciclan como posts.",
              en: "Short articles that answer common questions and get reused as posts.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "salon",
    tab: { es: "Peluquería", en: "Hair salon" },
    title: { es: "Peluquería", en: "Hair salon" },
    kind: { es: "Belleza", en: "Beauty" },
    summary: {
      es: "Para un salón especializado en color, con mucha comunidad en Instagram y reservas que hoy se pierden en los mensajes.",
      en: "For a color-focused salon with a big Instagram following and bookings that get lost in DMs.",
    },
    color: "#9d4b6b",
    stack: webStack,
    pages: [
      {
        slug: "salon",
        fonts: ["Cormorant Garamond", "Jost"],
        palette: ["#fbf5ef", "#1f1815", "#9a7b3f", "#9d4b6b"],
        notes: [
          {
            section: 1,
            title: { es: "Precios con duración", en: "Prices with duration" },
            text: {
              es: "Cada servicio dice cuánto cuesta y cuánto dura, para que nadie llegue con sorpresas.",
              en: "Each service shows its price and how long it takes, so nobody is surprised.",
            },
          },
          {
            section: 2,
            title: { es: "Antes y después", en: "Before and after" },
            text: {
              es: "Resultados comparados antes y después: el mejor argumento de venta de un salón de color.",
              en: "Before-and-after results: the best sales pitch a color salon has.",
            },
          },
          {
            section: 3,
            title: { es: "Reserva por servicio y estilista", en: "Booking by service and stylist" },
            text: {
              es: "La clienta elige con quién atenderse y a qué hora, sin esperar respuesta por chat.",
              en: "Clients pick who they want and when, without waiting for a reply.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "abogado",
    tab: { es: "Abogado", en: "Lawyer" },
    title: { es: "Abogado independiente", en: "Independent lawyer" },
    kind: { es: "Servicios legales", en: "Legal services" },
    summary: {
      es: "Para un abogado que no tenía marca ni web: identidad, sitio y primer contacto por WhatsApp.",
      en: "For a lawyer with no brand or website: identity, site and first contact over WhatsApp.",
    },
    color: "#b08d57",
    stack: webStack,
    pages: [
      {
        slug: "abogado",
        fonts: ["Newsreader", "Instrument Sans"],
        palette: ["#fdfcf7", "#17233f", "#b08d57", "#0a7a3a"],
        notes: [
          {
            section: 2,
            title: { es: "Servicios por área", en: "Practice areas" },
            text: {
              es: "Familia, laboral, arriendos… cada área abre WhatsApp con la consulta ya escrita.",
              en: "Family, employment, leases… each area opens WhatsApp with the question pre-written.",
            },
          },
          {
            section: 3,
            title: { es: "Orientador «¿por dónde empiezo?»", en: "“Where do I start?” guide" },
            text: {
              es: "La persona elige su situación y entiende qué hacer antes de pagar una consulta.",
              en: "People pick their situation and understand what to do before paying for a consultation.",
            },
          },
          {
            section: 8,
            title: { es: "Marca creada desde cero", en: "Brand built from scratch" },
            text: {
              es: "Monograma, paleta y piezas para WhatsApp y tarjetas: no tenía logo.",
              en: "Monogram, palette and assets for WhatsApp and business cards: there was no logo.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "asesoria",
    tab: { es: "Asesoría de seguros", en: "Insurance claims" },
    title: { es: "Asesoría de seguros", en: "Insurance claims advisory" },
    kind: { es: "Servicios", en: "Services" },
    summary: {
      es: "Para una asesoría regional que cobra seguros de vivienda: explicar un trámite enredado en una página liviana.",
      en: "For a regional firm that handles home insurance claims: explaining a messy process on a lightweight page.",
    },
    color: "#f2b730",
    stack: ["HTML", "CSS", "JavaScript"],
    pages: [
      {
        slug: "asesoria",
        fonts: ["Montserrat", "Michroma"],
        palette: ["#0f1c33", "#ffffff", "#f2b730", "#2f80ed"],
        notes: [
          {
            section: 0,
            title: { es: "HTML y CSS puro", en: "Plain HTML and CSS" },
            text: {
              es: "Sin framework: carga instantánea incluso con mala señal, que es cuando más la necesitan.",
              en: "No framework: instant load even on a weak signal, which is exactly when people need it.",
            },
          },
          {
            section: 2,
            title: { es: "Aviso de urgencia", en: "Urgency banner" },
            text: {
              es: "Después de un sismo, un bloque destacado lleva directo a activar el seguro.",
              en: "After an earthquake, a highlighted block leads straight to filing the claim.",
            },
          },
          {
            section: 4,
            title: { es: "Proceso paso a paso", en: "Step-by-step process" },
            text: {
              es: "Pasos cortos que traducen un trámite de seguros a lenguaje simple.",
              en: "Short steps that translate an insurance claim into plain language.",
            },
          },
        ],
      },
    ],
  },
];
