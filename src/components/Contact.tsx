import { siteConfig } from "@/content/site";
import type { Dictionary } from "@/i18n/get-dictionary";
import { CopyButton } from "./CopyButton";

// Cierre de la landing (sobre la escena 3D): titular, una terminal con datos y contacto, y el pie.
export function Contact({ dict, number }: { dict: Dictionary; number: string }) {
  const t = dict.contact;
  const h = dict.hero;
  const facts = [
    { key: h.now, value: h.nowValue },
    { key: h.studies, value: h.studiesValue },
    { key: h.daily, value: h.dailyValue },
  ];
  const { email, links } = siteConfig;
  const elsewhere = [
    links.github && { href: links.github, label: "github" },
    links.linkedin && { href: links.linkedin, label: "linkedin" },
  ].filter((item) => !!item);

  return (
    <div className="relative">
      <section id="contact" aria-labelledby="contact-title" className="flex min-h-[calc(100svh-4rem)] items-center">
        <div className="mx-auto grid w-full max-w-[100rem] gap-8 px-4 pt-20 pb-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-14 lg:px-14">
          <div className="web3d-panel lg:col-span-5">
            <p className="label text-accent">
              {number} · {dict.nav.contact}
            </p>
            <h2
              id="contact-title"
              className="mt-4 font-display text-[clamp(1.8rem,3.2vw,3rem)] leading-[1.05] font-medium tracking-[-0.055em] text-balance [font-stretch:87.5%]"
            >
              {t.title} <span className="text-accent">{t.titleEmphasis}</span>
            </h2>
          </div>

          {/* Terminal */}
          <div className="terminal lg:col-span-6 lg:col-start-7">
            <div className="flex h-9 items-center gap-3 border-b border-border px-3.5">
              <span aria-hidden="true" className="flex gap-1.5">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="size-2.5 rounded-full bg-border-strong" />
                ))}
              </span>
              <span className="mx-auto font-mono text-[11px] text-muted">jorge@scl: ~/{t.folder}</span>
              <span aria-hidden="true" className="w-[2.6rem]" />
            </div>
            <div className="space-y-5 p-5 font-mono text-[13px] leading-relaxed sm:p-6">
              <div>
                <p className="text-muted">
                  <span className="text-accent">$</span> {t.cmdAbout}
                </p>
                <p className="mt-1.5 font-sans text-[15px] text-pretty text-foreground">{t.text}</p>
              </div>
              <div>
                <p className="text-muted">
                  <span className="text-accent">$</span> {t.cmdFacts}
                </p>
                <dl aria-label={h.factsLabel} className="mt-1.5 text-[12.5px]">
                  {facts.map((fact) => (
                    <div key={fact.key}>
                      <dt className="tok-key inline">{fact.key}</dt>
                      <span aria-hidden="true" className="tok-punct">
                        :{" "}
                      </span>
                      <dd className="tok-str inline">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {email && (
                <div>
                  <p className="text-muted">
                    <span className="text-accent">$</span> echo $EMAIL
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <a
                      href={`mailto:${email}`}
                      className="text-[15px] break-all text-foreground underline decoration-border-strong decoration-1 underline-offset-[0.3em] transition-colors hover:text-accent hover:decoration-accent sm:text-lg"
                    >
                      {email}
                    </a>
                    <CopyButton value={email} label={dict.hero.copy} done={dict.hero.copied} tone="accent" />
                  </div>
                </div>
              )}
              {elsewhere.length > 0 && (
                <div>
                  <p className="text-muted">
                    <span className="text-accent">$</span> ls ~/{t.elsewhere}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-x-5">
                    {elsewhere.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground transition-colors hover:text-accent"
                      >
                        {item.label}/ <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </p>
                </div>
              )}
              <p aria-hidden="true" className="text-muted">
                <span className="text-accent">$</span> <span className="caret" />
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/80 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 font-mono text-[11px] text-muted sm:px-8">
          <p>
            © {new Date().getFullYear()} · {t.credit}
          </p>
          <div className="flex gap-6">
            {links.repo && (
              <a href={links.repo} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">
                {t.code} ↗
              </a>
            )}
            <a href="#main" className="transition-colors hover:text-accent">
              {t.backToTop} ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
