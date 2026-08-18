import Link from "next/link";
import AnchorLink from "./AnchorLink";
import NewsletterForm from "./NewsletterForm";
import { NAV_LINKS, SITE_NAME } from "@/lib/data";
import { SOCIAL_LINKS } from "./SocialBrand";

interface FooterProps {
  /** A hírlevél-sáv megjelenjen-e a footerben. A főoldal saját hírlevél-
   *  szekciót kapott, ott kikapcsoljuk, hogy ne legyen kétszer. */
  showNewsletter?: boolean;
}

export default function Footer({ showNewsletter = true }: FooterProps) {
  return (
    <footer className="border-t border-zinc-800/60">
      {showNewsletter && (
        <div className="mx-auto max-w-6xl px-6 pt-12">
          <NewsletterForm />
        </div>
      )}
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
          <Link
            href="/adatvedelem"
            className="transition-colors hover:text-amber-500"
          >
            Adatvédelmi tájékoztató
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
