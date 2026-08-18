"use client";

import { Ruler } from "lucide-react";

interface ScaleComparisonProps {
  heightCm: number;
  widthCm: number;
  depthCm: number;
  scale: string;
  comparisonObject: string;
}

// Referencia tárgy magassága cm-ben (0,5 l-es Coca-Cola PET palack
// kupakkal együtt ~23,5 cm)
const REFERENCE_CM = 23.5;

// A cm-érték magyar tizedesvesszős megjelenítése (pl. 23,5)
const formatCm = (value: number) => String(value).replace(".", ",");
// A PET palack SVG képaránya a levágott (tight) viewBox alapján (640 × 2176)
const BOTTLE_RATIO = 640 / 2176;
// A palack szélesség-tényezője: a valódi arány mellett a palack túl vékony
// lenne mobilon (alig 11 px), ezért kissé „tömöttebb" megjelenést kap — a
// MAGASSÁGA változatlan marad, így a 23,5 cm-es méretarány pontos marad.
const BOTTLE_WIDTH_SCALE = 1.6;

export default function ScaleComparison({
  heightCm,
  widthCm,
  depthCm,
  scale,
}: ScaleComparisonProps) {
  // A grafika magassága arányos: max 100 egység, a magasabb elemhez igazítva
  const maxCm = Math.max(heightCm, REFERENCE_CM);
  const figureH = (heightCm / maxCm) * 100;
  const refH = (REFERENCE_CM / maxCm) * 100;
  const labelOffset = 26;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Ruler className="h-4 w-4 text-amber-500" />
        Méret szemléltetés
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Valós méretarány egy 0,5L üdítős palack mellett
      </p>

      <svg
        viewBox="0 0 320 164"
        role="img"
        aria-label={`A szobor ${heightCm} cm magas, egy 0,5L üdítős palack mellett`}
        className="mt-4 h-auto w-full"
      >
        {/* Talapzat vonal */}
        <line x1="20" y1="124" x2="300" y2="124" stroke="#3f3f46" strokeWidth="2" />

        {/* Szobor sziluettje */}
        <path
          d={`M 90 ${124 - figureH} 
              C 80 ${124 - figureH * 0.35} 70 ${124 - figureH * 0.1} 52 ${124}
              L 128 ${124}
              C 110 ${124 - figureH * 0.1} 100 ${124 - figureH * 0.35} 90 ${124 - figureH} Z`}
          fill="#d97706"
          opacity="0.85"
        />
        {/* Szobor magasság vonal */}
        <line
          x1="52"
          y1={124 - figureH - 6}
          x2="52"
          y2="124"
          stroke="#71717a"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="52"
          y={124 - figureH - 10}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="10"
        >
          {heightCm} cm
        </text>

        {/* Referencia: 0,5 l-es PET palack (a mellékelt SVG sziluettje —
            az oldal borostyán színében, a fájl neve verziózva, hogy a
            böngésző cache ne tartsa meg a régi fekete verziót) */}
        <image
          href="/images/comparison-bottle-amber.svg"
          x={227.5 - (refH * BOTTLE_RATIO * BOTTLE_WIDTH_SCALE) / 2}
          y={124 - refH}
          width={refH * BOTTLE_RATIO * BOTTLE_WIDTH_SCALE}
          height={refH}
          preserveAspectRatio="xMidYMid meet"
          className="scale-bottle-img"
        />
        {/* Palack magasság vonal */}
        <line
          x1="266"
          y1={124 - refH - 6}
          x2="266"
          y2="124"
          stroke="#71717a"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x="266"
          y={124 - refH - 10}
          textAnchor="middle"
          fill="#a1a1aa"
          fontSize="10"
        >
          {formatCm(REFERENCE_CM)} cm
        </text>

        {/* Jelmagyarázat — a talapzat alatt, hogy soha ne takarja a címkéket */}
        <rect x={labelOffset} y="138" width="12" height="12" rx="3" fill="#d97706" />
        <text x={labelOffset + 18} y="148" fill="#a1a1aa" fontSize="11">
          Szobor
        </text>
        <rect x={170} y="138" width="12" height="12" rx="3" fill="none" stroke="#71717a" strokeWidth="2" />
        <text x={188} y="148" fill="#a1a1aa" fontSize="11">
          0,5L üdítős palack
        </text>
      </svg>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-800/60 pt-4 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Magasság
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">
            {heightCm} cm
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Szélesség
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">
            {widthCm} cm
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Mélység
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">
            {depthCm} cm
          </dd>
        </div>
      </dl>
      <p className="mt-3 rounded-lg bg-zinc-950/60 px-3 py-2 text-center text-xs text-zinc-400">
        Méretarány: <span className="font-semibold text-zinc-200">{scale}</span>
      </p>
    </div>
  );
}
