/**
 * „Szállítható" illusztráció — szállító teherautó csomaggal.
 * A stílus illeszkedik a többi grafikához: sötét háttér, szürke vonalrajz,
 * borostyán (amber) kiemelésekkel.
 */
export default function ShippableGraphic() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Szállító teherautó"
      className="h-20 w-20 shrink-0"
    >
      <defs>
        <linearGradient id="ship-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#18181b" />
          <stop offset="1" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="ship-glow" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0" stopColor="#d97706" stopOpacity="0.14" />
          <stop offset="1" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="10" y="10" width="180" height="180" rx="28" fill="url(#ship-bg)" />
      <rect x="10" y="10" width="180" height="180" rx="28" fill="url(#ship-glow)" />
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

      <g
        stroke="#a1a1aa"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Rakodótér */}
        <rect x="42" y="60" width="86" height="66" rx="6" />
        {/* Rakodótér-ajtóvonalak */}
        <path d="M70 60 V126" stroke="#71717a" strokeWidth="2.5" />
        {/* Csomag a rakodótérben */}
        <rect
          x="54"
          y="88"
          width="30"
          height="24"
          rx="3"
          fill="#d97706"
          fillOpacity="0.28"
          stroke="none"
        />
        <path d="M54 92 L69 100 L84 92" stroke="#d97706" strokeWidth="3" />
        <path d="M69 100 V112" stroke="#d97706" strokeWidth="3" />

        {/* Fülke — enyhén lejtő orral */}
        <path d="M128 66 L164 82 L164 106 C164 112 158 116 150 116 L128 116 Z" />
        {/* Szélvédő */}
        <path d="M132 72 L156 84 L156 104 L132 104 Z" stroke="#71717a" strokeWidth="2.5" />
        {/* Fényszóró */}
        <circle cx="160" cy="98" r="3.5" fill="#d97706" stroke="none" />

        {/* Alváz */}
        <path d="M42 126 L166 126" stroke="#71717a" strokeWidth="3" />
        {/* Kerekek */}
        <circle cx="70" cy="134" r="13" />
        <circle cx="70" cy="134" r="5" fill="#d97706" stroke="none" />
        <circle cx="138" cy="134" r="13" />
        <circle cx="138" cy="134" r="5" fill="#d97706" stroke="none" />

        {/* Mozgásvonalak a haladás irányába */}
        <path d="M176 90 C182 90 186 94 186 100" stroke="#d97706" strokeWidth="3" />
        <path d="M176 104 C182 104 186 108 186 114" stroke="#d97706" strokeWidth="3" />
      </g>
    </svg>
  );
}
