"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Újranavigáció után a #horgonyra görget — így a másik oldalról érkező
 * „/#galeria” típusú linkek is a megfelelő szekcióhoz érkeznek.
 */
export default function ScrollToHash() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/" || !window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    if (!el) return;
    // Rövid késleltetés, hogy az elrendezés/képek stabilizálódjanak
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
