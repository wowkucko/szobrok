"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useIsMobile } from "@/lib/useIsMobile";

/** Mobilon megjelenő lebegő gomb, amely az oldal tetejére gördít.
 *  Csak akkor látszik, ha a felhasználó már lejjebb görgetett. */
export default function ScrollToTopButton() {
  const isMobile = useIsMobile();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(false);
      return;
    }
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  if (!isMobile || !show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Ugrás az oldal tetejére"
      className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-zinc-950 shadow-lg shadow-amber-600/30 transition-colors hover:bg-amber-500"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
