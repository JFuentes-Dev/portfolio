import { siteConfig } from "@/content/site";
import type { Dictionary } from "@/i18n/get-dictionary";
import { CopyButton } from "./CopyButton";

// Cierre en tinta: contacto compacto y pie de página en el mismo bloque.
export function Contact({ dict }: { dict: Dictionary }) {
  const t = dict.contact;
  const { email, links } = siteConfig;
  const elsewhere = [
    links.github && { href: links.github, label: "GitHub" },
    links.linkedin && { href: links.linkedin, label: "LinkedIn" },
  ].filter((item) => !!item);

  return (
    <div className="bg-foreground text-background">
      <section id="contact" aria-labelledby="contact-title" className="snap-start">
        <div className="mx-auto grid max-w-[100rem] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:items-end">
          <h2
            id="contact-title"
            className="font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.02em] text-balance lg:col-span-7"
          >
            {t.title} <em className="text-accent-inverse">{t.titleEmphasis}</em>
          </h2>
          <div className="lg:col-span-5">
            <p className="max-w-md text-base leading-relaxed text-pretty opacity-75">{t.text}</p>
            {email && (
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <a
                  href={`mailto:${email}`}
                  className="font-display text-2xl break-all underline decoration-1 underline-offset-[0.18em] transition-colors hover:text-accent-inverse sm:text-3xl"
                >
                  {email}
                </a>
                <CopyButton value={email} label={dict.hero.copy} done={dict.hero.copied} tone="inverse" />
              </div>
            )}
            {elsewhere.length > 0 && (
              <p className="mt-5 text-sm opacity-75">
                {t.elsewhere}{" "}
                {elsewhere.map((item, i) => (
                  <span key={item.label}>
                    {i > 0 && " · "}
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-1 underline-offset-[0.2em] hover:text-accent-inverse"
                    >
                      {item.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-background/15">
        <div className="label mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 opacity-70 sm:px-8">
          <p>
            © {new Date().getFullYear()} · {t.credit}
          </p>
          <div className="flex gap-6">
            {links.repo && (
              <a href={links.repo} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent-inverse">
                {t.code} ↗
              </a>
            )}
            <a href="#main" className="transition-colors hover:text-accent-inverse">
              {t.backToTop} ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
