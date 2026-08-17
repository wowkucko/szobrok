"use client";

import { useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useBookmarks } from "@/lib/useBookmarks";

interface BookmarkButtonProps {
  productId: string;
  title: string;
  variant?: "overlay" | "default";
}

export default function BookmarkButton({
  productId,
  title,
  variant = "default",
}: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookmarked = isBookmarked(productId);

  const handleClick = () => {
    toggleBookmark(productId);
    setPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(false), 350);
  };

  const base =
    variant === "overlay"
      ? "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm"
      : "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label={
        bookmarked
          ? `${title} eltávolítása a kedvencekből`
          : `${title} mentése a kedvencek közé`
      }
      className={`${base} transition-colors ${
        bookmarked
          ? "border-amber-500/60 bg-amber-500/20 text-amber-500"
          : variant === "overlay"
            ? "border-zinc-700/80 bg-zinc-950/60 text-zinc-300 hover:border-amber-600/60 hover:text-amber-500"
            : "border-zinc-800 text-zinc-400 hover:border-amber-600/60 hover:text-amber-500"
      }`}
    >
      <Heart
        className={`h-4 w-4 ${
          pulse ? "animate-[bookmark-pop_0.35s_ease-out]" : ""
        }`}
        fill={bookmarked ? "currentColor" : "none"}
        strokeWidth={bookmarked ? 2.5 : 2}
      />
      {variant === "default" && (bookmarked ? "Kedvenceknél" : "Kedvencekhez")}
    </button>
  );
}
