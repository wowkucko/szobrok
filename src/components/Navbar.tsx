"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu, X } from "lucide-react";
import NavLinks from "./NavLinks";
import { SITE_NAME } from "@/lib/data";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Útvonalváltáskor automatikus bezárás (pl. CTA, hero gomb, böngészer navigáció),
  // nem csak a menüben lévő linkre kattintva — render közbeni állapot-igazítással
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Ha a nézet asztalira vált (a hamburger eltűnik, md+), zárjuk be a menüt,
  // hogy a háttér-görgetés ne maradjon zárolva és ne legyen zavaró átmenet
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Nyitott menünél: háttér-görgetés zár + fókusz a menübe (fókuszcsapda) + bezárás Escape-pel / kívülre kattintva
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // A görgetősáv eltűnése miatt a tartalom oldalra csúszna — kompenzáljuk
    // a sáv szélességével (jobb padding), így nyitáskor/záráskor nincs ugrálás
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const button = buttonRef.current;
    const FOCUSABLE =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Fókusz a menü első fókuszállható elemébe.
    // A visibility: hidden elemre a focus() néma kudarc — ezért minden frame-ben
    // újrapróbáljuk, amíg a panel tényleg látható nem lesz (a megjelenés animáció közben).
    const tryFocus = () => {
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>(FOCUSABLE);
      if (!target) return;
      if (getComputedStyle(panel).visibility === "hidden") {
        raf = requestAnimationFrame(tryFocus);
        return;
      }
      target.focus();
    };
    let raf = requestAnimationFrame(tryFocus);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      // Fókuszcsapda: a Tab / Shift+Tab a menün belül marad
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      cancelAnimationFrame(raf);
      // Visszaállítás (az előző értékre, nem felülírva mást)
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
      // Ha még a menüben van a fókusz, adjuk vissza a hamburger gombnak
      if (panel?.contains(document.activeElement)) {
        button?.focus();
      }
    };
  }, [open]);

  return (
    <>
      {/* Sötétítő háttér a nyitott mobil menü mögött — kattintásra zár.
          A fejléc testvére, mert a fejléc backdrop-blur-ja befoglaló blokkot
          hozna létre a fixed elemnek (nem fedné le a teljes nézetet). */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        className={`fixed inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300 ease-out md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {SITE_NAME}
        </Link>

        {/* Asztali menü */}
        <nav className="hidden items-center gap-7 md:flex">
          <NavLinks />
        </nav>

        {/* Jobb oldal: CTA (csak asztali) + mobil hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="hidden h-9 items-center rounded-full bg-amber-600 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 md:inline-flex"
          >
            Megvásárolható alkotások
          </Link>

          {/* Mobil hamburger menü */}
          <div ref={dropdownRef} className="relative md:hidden">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Menü bezárása" : "Menü megnyitása"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-300 transition-colors hover:border-amber-600 hover:text-amber-500"
            >
              {/* A két ikon egymáson: a váltás forgással + halványulással történik */}
              <span className="relative block h-5 w-5">
                <Menu
                  className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                    open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
                  }`}
                />
                <X
                  className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                    open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
                  }`}
                />
              </span>
            </button>

            <div
              ref={panelRef}
              aria-hidden={!open}
              className={`absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-[0_4px_16px_rgba(0,0,0,0.45),0_24px_48px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 ease-out ${
                open
                  ? "visible translate-y-0 scale-100 opacity-100"
                  : "invisible -translate-y-2 scale-95 opacity-0"
              }`}
            >
                <nav className="flex flex-col gap-1">
                  <NavLinks
                    className="rounded-lg px-3 py-2 hover:bg-zinc-900"
                    onNavigate={() => setOpen(false)}
                  />
                </nav>
                {!isHome && (
                  <>
                    <div className="my-2 border-t border-zinc-800" />
                    <Link
                      href="/"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-amber-500"
                    >
                      <Home className="h-4 w-4" />
                      Vissza a főoldalra
                    </Link>
                  </>
                )}
                <Link
                  href="/portfolio"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-amber-600 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
                >
                  Megvásárolható alkotások
                </Link>
            </div>
          </div>
        </div>
      </div>
      </header>
    </>
  );
}
