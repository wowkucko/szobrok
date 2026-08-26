"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Útvonalváltáskor (pl. főoldal → blog) az oldal tetejére ugrik, így a
 *  listázó mindig felülről indul, nem a korábbi görgetési pozícióban. */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
