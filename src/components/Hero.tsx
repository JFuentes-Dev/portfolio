import { siteConfig } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { CopyButton } from "./CopyButton";
import { DecodeText } from "./DecodeText";
import { GyroButton } from "./GyroButton";
import { LocalTime } from "./LocalTime";
import { PhotoCard } from "./PhotoCard";

// Presentación: el primer panel de la landing, junto al marco 3D que empieza a dibujarse. Los
// tamaños dependen también del alto para que el panel quepa sin scroll en laptops bajos.
export function HeroIntro({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.hero;
  const { email, links, photo } = siteConfig;

  return (
    <>
      <div className="flex items-center gap-4">
        {photo && <PhotoCard priority src={photo} alt={t.photoAlt} className="w-[4.5rem] shrink-0 sm:w-[5rem]" />}
        <div className="min-w-0">
          <p className="label tracking-normal text-muted normal-case">
            <span className="text-accent">jorge@scl</span>:~$ <span className="typed">whoami</span>
            <span aria-hidden="true" className="caret" />
          </p>
          <p className="label mt-1.5 text-foreground">{t.kicker}</p>
          <p className="label mt-1.5 text-muted">
            {t.base} · <LocalTime timeZone={siteConfig.timeZone} locale={locale} />
          </p>
        </div>
      </div>

      <h1
        id="hero-title"
        data-decode
        className="mt-6 font-display text-[clamp(1.7rem,min(3.1vw,5.6svh),3.3rem)] leading-[1.06] font-medium tracking-[-0.055em] text-balance [font-stretch:87.5%]"
      >
        <DecodeText parts={[{ text: `${t.titleStart} ` }, { text: t.titleEmphasis, className: "text-accent" }]} />
      </h1>

      <p className="mt-4 text-[15px] leading-relaxed text-pretty text-muted sm:text-base">{t.lead}</p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href="#work" className="btn-primary">
          <span aria-hidden="true" className="opacity-60">
            &gt;
          </span>
          {t.ctaWork}
          <span aria-hidden="true">↓</span>
        </a>
        {links.github && (
          <a href={links.github} target="_blank" rel="noopener noreferrer" className="link-underline font-mono text-[13px]">
            GitHub <span aria-hidden="true">↗</span>
          </a>
        )}
        <span className="md:hidden">
          <GyroButton label={t.motion} />
        </span>
      </div>

      {email && (
        <p className="mt-4 hidden items-center gap-3 sm:flex [@media(max-height:720px)]:hidden">
          <a href={`mailto:${email}`} className="link-underline truncate font-mono text-[13px]">
            {email}
          </a>
          <CopyButton value={email} label={t.copy} done={t.copied} />
        </p>
      )}

      <p className="label mt-6 hidden items-center gap-3 text-faint md:flex [@media(max-height:720px)]:hidden">
        <span className="scroll-cue-line" />
        {dict.process.scroll}
      </p>
    </>
  );
}
