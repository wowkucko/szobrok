import Link from "next/link";
import AnchorLink from "./AnchorLink";
import { NAV_LINKS, SITE_NAME } from "@/lib/data";
import { SOCIAL_LINKS } from "./SocialBrand";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-6 py-12 text-center md:flex-row md:items-start md:text-left">
        <div>
          <p className="text-sm font-semibold">{SITE_NAME}</p>
          <p className="mt-2 max-w-xs text-sm text-zinc-500">
            Kézzel festett, 3D nyomtatott szobrok és gyűjtői figurák.
          </p>
        </div>
        <nav className="flex flex-col gap-3 text-sm text-zinc-400">
          {NAV_LINKS.map((link) => (
            <AnchorLink
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-amber-500"
            >
              {link.label}
            </AnchorLink>
          ))}
          <Link
            href="/portfolio"
            className="transition-colors hover:text-amber-500"
          >
            Megvásárolható alkotások
          </Link>
          <Link
            href="/aszf"
            className="transition-colors hover:text-amber-500"
          >
            ÁSZF
          </Link>
        </nav>
        <div className="flex gap-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              title={social.name}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 transition-colors hover:border-amber-600 hover:shadow-[0_0_16px_rgba(217,119,6,0.12)]"
            >
              <social.Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-zinc-800/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-zinc-600 sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE_NAME}. Minden jog fenntartva.</p>
          <p>Készítve Next.js-szel</p>
        </div>
      </div>
    </footer>
  );
}
