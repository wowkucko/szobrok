"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** A doboz mérete (Tailwind osztály, alapértelmezett: h-5 w-5). */
  sizeClassName?: string;
  /** Extra osztályok a dobozra (pl. margó a szöveghez igazításhoz). */
  className?: string;
}

/** Egyedi, a weboldal prémium sötét/borostyán stílusához illő checkbox.
 *  A natív input rejtett marad (sr-only), de a billentyűzetes kezelés és az
 *  űrlap-működés teljesen natív — csak a megjelenés egyedi. */
export default function Checkbox({
  checked,
  onChange,
  sizeClassName = "h-5 w-5",
  className = "",
}: CheckboxProps) {
  return (
    <>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-600/40 ${
          sizeClassName
        } ${
          checked
            ? "border-amber-600 bg-amber-600 shadow-[0_0_12px_rgba(217,119,6,0.35)]"
            : "border-zinc-700 bg-zinc-950 hover:border-amber-600/60"
        } ${className}`}
      >
        <Check
          strokeWidth={3}
          className={`h-3.5 w-3.5 text-zinc-950 transition-transform duration-200 ${
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        />
      </span>
    </>
  );
}
