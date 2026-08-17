import Image from "next/image";
import PickupMap from "./portfolio/PickupMap";
import { SOCIAL_LINKS } from "./SocialBrand";

// Social media jellegű SVG: beszédbuborék szívvel (like/komment) + kis komment-buborék
function SocialIcon({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="social-grad" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Kis komment-buborék (felül jobbra) */}
      <path
        d="M68 14 h16 a8 8 0 0 1 8 8 v6 a8 8 0 0 1 -8 8 h-16 a8 8 0 0 1 -8 -8 v-6 a8 8 0 0 1 8 -8 z"
        stroke="url(#social-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="rgba(217,119,6,0.08)"
      />
      <circle cx="74" cy="22" r="1.6" fill="url(#social-grad)" />
      <circle cx="78" cy="22" r="1.6" fill="url(#social-grad)" />
      <circle cx="82" cy="22" r="1.6" fill="url(#social-grad)" />
      {/* Fő beszédbuborék */}
      <path
        d="M34 68 h-6 a10 10 0 0 1 -10 -10 V40 a10 10 0 0 1 10 -10 h44 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 H50 l-12 12 v-12 z"
        stroke="url(#social-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="rgba(217,119,6,0.08)"
      />
      {/* Szív a buborékban */}
      <path
        d="M48 62 c-9.5 -7 -16 -13 -16 -21 a8.6 8.6 0 0 1 16 -4.8 a8.6 8.6 0 0 1 16 4.8 c0 8 -6.5 14 -16 21 z"
        stroke="url(#social-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
        fill="rgba(217,119,6,0.08)"
      />
    </svg>
  );
}

// A három csempe közös "mű-sávja": azonos magasság, azonos háttér,
// benne középre igazított grafika — így a sor egységesen hat.
const ART_BAND_CLASSES =
  "flex h-44 shrink-0 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.10),transparent_70%)]";

export default function TrustTiles() {
  return (
    <section className="border-b border-zinc-800/60 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {/* 1. csempe — Partner */}
          <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 transition-colors duration-300 hover:border-amber-800/50">
            <div className={`${ART_BAND_CLASSES} px-8`}>
              <Image
                src="/images/partner.svg"
                alt=""
                width={600}
                height={315}
                className="h-auto max-h-[132px] w-auto max-w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              />
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-lg font-semibold text-zinc-100">Partner</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                A termékek értékesítése a Meska kézműves piacon keresztül zajlik,
                mely gondoskodik a kényelmes és biztonságos vásárlásról.
              </p>
            </div>
          </article>

          {/* 2. csempe — Átvételi lehetőség */}
          <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 transition-colors duration-300 hover:border-amber-800/50">
            <div className="h-44 shrink-0 overflow-hidden">
              <PickupMap frameless className="h-full w-full" />
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-lg font-semibold text-zinc-100">
                Átvételi lehetőség
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                A legtöbb termék Budapest környékén személyesen vehető át. Az
                átvételi pontokat az interaktív térképen találod — kattints a
                jelölőkre a nevekért.
              </p>
            </div>
          </article>

          {/* 3. csempe — Social media */}
          <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 transition-colors duration-300 hover:border-amber-800/50">
            <div className={ART_BAND_CLASSES}>
              <SocialIcon className="h-24 w-24 transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-lg font-semibold text-zinc-100">
                Kövess a social media felületeken
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Kövesd az új megjelenéseket, a folyamatban lévő munkákat és a
                kulisszák mögötti tartalmakat.
              </p>
              <div className="mt-auto flex items-center justify-center gap-4 pt-7">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    title={social.name}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-900/60 transition-all duration-300 hover:-translate-y-0.5 hover:scale-110 hover:border-zinc-500 hover:shadow-[0_0_20px_rgba(217,119,6,0.15)]"
                  >
                    <social.Icon />
                  </a>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
