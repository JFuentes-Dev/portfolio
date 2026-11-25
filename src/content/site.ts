export const siteConfig = {
  name: "Jorge Fuentes",
  initials: "JF",
  // En GitHub Actions lo define el workflow de deploy con la URL de Pages (o el dominio propio).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  email: "fuentesvargas.js@gmail.com",
  // Ruta en /public. Vacío = se muestran las iniciales.
  photo: "/foto.jpg",
  links: {
    github: "https://github.com/JFuentes-Dev",
    // TODO: agregar LinkedIn. Vacío = no se muestra.
    linkedin: "",
    // Código de este sitio (pie de página).
    repo: "https://github.com/JFuentes-Dev/portfolio",
  },
  // Zona horaria para el reloj junto a la foto.
  timeZone: "America/Santiago",
};
