"use client";

import { useEffect, useState } from "react";

/** Igaz, ha a viewport a megadott töréspont alatt van (mobil). SSR-ben false,
 *  kliensen a mount után pontos érték — így nincs hidratálási eltérés. */
export function useIsMobile(breakpoint = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}
