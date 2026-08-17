"use client";

import { useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

function getCurrentUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

export default function ShareButtons() {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    const url = getCurrentUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // régi böngészőknél fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleFacebook = () => {
    const url = getCurrentUrl();
    if (!url) return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer,width=640,height=480"
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Share2 className="h-4 w-4 text-amber-500" />
        Tetszik ez a szobor? Oszd meg ismerőseiddel!
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleFacebook}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook Megosztás
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm font-medium text-zinc-300 transition-colors hover:border-amber-600/60 hover:text-amber-500"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              Link másolva!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Link másolása
            </>
          )}
        </button>
      </div>
    </div>
  );
}
