"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AnchorLinkProps {
  href: string; // pl. "#galeria"
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Horgony link, ami MINDEN oldalról működik:
 * - a főoldalon sima #horgony (azonnali görgetés),
 * - más oldalakon előbb a főoldalra navigál, majd a szekcióra görget.
 */
export default function AnchorLink({
  href,
  className,
  children,
  onClick,
}: AnchorLinkProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <Link href={isHome ? href : `/${href}`} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
