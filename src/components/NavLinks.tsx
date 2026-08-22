"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/data";

/**
 * Menü-linkek aktív szekció-jelzéssel.
 * - A főoldalon görgetéskor kiemeli, épp melyik szekciónál tartasz.
 * - Más oldalakon a linkek a főoldalra + horgonyra visznek (aktív jelzés nincs).
 */
export default function NavLinks({
  className = "",
  onNavigate,
}: {
  className?: string;
  /** Kattintás után hívódik (pl. mobil menü bezárása). */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [active, setActive] = useState<string | null>(null);

  // Scroll-spy: a fix menüsor alatti utolsó szekció lesz az aktív.
  // A küszöb a menüsor tényleges magassága, így a váltás pontosan a
  // menüsor aljánál történik — nem korábban, nem később.
  useEffect(() => {
    if (!isHome) return;
    let ticking = false;
    const offset =
      document.querySelector("header")?.getBoundingClientRect().height ?? 64;
    const update = () => {
      ticking = false;
      let current: string | null = null;
      for (const link of NAV_LINKS) {
        const el = document.getElementById(link.href.slice(1));
        if (el && el.getBoundingClientRect().top <= offset) {
          current = link.href;
        }
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const raf = requestAnimationFrame(update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [isHome]);

  const activeHref = isHome ? active : null;

  return (
    <>
      {NAV_LINKS.map((link) => {
        const isRoute = link.href.startsWith("/");
        const href = isRoute ? link.href : isHome ? link.href : `/${link.href}`;
        const isActive = !isRoute && activeHref === link.href;
        return (
          <Link
            key={link.href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "true" : undefined}
            className={`text-sm transition-colors ${
              isActive
                ? "text-amber-500 underline decoration-amber-500/60 underline-offset-8"
                : "text-zinc-400 hover:text-amber-500"
            } ${className}`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
