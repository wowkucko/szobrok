import type { PrintTechnology } from "@/types/product";

interface PrintTechGraphicProps {
  technology: PrintTechnology;
}

/**
 * A nyomtatási technológiához tartozó illusztráció:
 * - MSLA Resin (12K)  → gyantaüveg
 * - FDM (0.08 mm)     → PLA filament tekercs
 * A stílus illeszkedik a helykitöltő SVG-khez: sötét háttér, szürke vonalrajz,
 * borostyán (amber) kiemelésekkel.
 */
export default function PrintTechGraphic({ technology }: PrintTechGraphicProps) {
  const isResin = technology === "MSLA Resin (12K)";

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={isResin ? "MSLA gyantaüveg" : "PLA filament tekercs"}
      className="h-24 w-24 shrink-0"
    >
      <defs>
        <linearGradient id="tech-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#18181b" />
          <stop offset="1" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="tech-glow" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0" stopColor="#d97706" stopOpacity="0.14" />
          <stop offset="1" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="10" y="10" width="180" height="180" rx="28" fill="url(#tech-bg)" />
      <rect x="10" y="10" width="180" height="180" rx="28" fill="url(#tech-glow)" />
      <rect
        x="10"
        y="10"
        width="180"
        height="180"
        rx="28"
        fill="none"
        stroke="#27272a"
        strokeWidth="2"
      />

      {isResin ? <ResinBottle /> : <PLASpool />}
    </svg>
  );
}

/** MSLA gyantaüveg */
function ResinBottle() {
  return (
    <g
      stroke="#a1a1aa"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Kupak */}
      <rect x="84" y="42" width="32" height="16" rx="4" fill="#52525b" />
      {/* Üveg test */}
      <path d="M96 58 L96 68 C78 72 66 84 66 102 L66 152 C66 162 74 168 84 168 L116 168 C126 168 134 162 134 152 L134 102 C134 84 122 72 104 68 L104 58 Z" />
      {/* Gyanta szint */}
      <path
        d="M70 92 L70 152 C70 160 76 164 84 164 L116 164 C124 164 130 160 130 152 L130 92 Z"
        fill="#d97706"
        fillOpacity="0.28"
        stroke="none"
      />
      {/* Folyadék hullám */}
      <path d="M70 92 C80 88 92 96 102 92 C112 88 122 96 130 92" />
      {/* Címke */}
      <rect x="66" y="112" width="68" height="24" rx="4" fill="#09090b" />
      <path d="M78 124 H122" stroke="#d97706" strokeWidth="3" />
      <path d="M84 120 H116" stroke="#71717a" strokeWidth="2" />
    </g>
  );
}

/** PLA filament tekercs */
function PLASpool() {
  return (
    <g
      stroke="#a1a1aa"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Külső perem */}
      <circle cx="100" cy="100" r="58" />
      {/* Belső perem */}
      <circle cx="100" cy="100" r="34" />
      {/* Agy / közép lyuk */}
      <circle cx="100" cy="100" r="12" fill="#52525b" />
      {/* Küllők */}
      <path d="M100 66 L100 88" />
      <path d="M100 112 L100 134" />
      <path d="M66 100 L88 100" />
      <path d="M112 100 L134 100" />
      {/* Feltekert filament */}
      <path
        d="M100 88 C112 88 116 98 112 106 C108 114 96 114 92 106 C88 98 92 88 100 88"
        stroke="#d97706"
        strokeWidth="3"
      />
      {/* Lejövő szál */}
      <path d="M158 100 C170 102 172 114 166 124 C162 131 154 134 148 138" stroke="#d97706" strokeWidth="3" />
    </g>
  );
}
