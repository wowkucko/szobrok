"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Video } from "lucide-react";

interface ProductVideoProps {
  videoUrl: string;
  /** Lejátszás előtt megjelenő kép (a termék bélyegképe). */
  poster?: string;
  title: string;
}

/** YouTube link → videó ID (vagy null, ha nem YouTube). */
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const p = u.pathname.match(/\/embed\/([\w-]+)/);
      if (p) return p[1];
    }
  } catch {
    // nem URL → nem YouTube
  }
  return null;
}

/** Videófájl-e a link (mp4, webm, mov, m4v)? */
function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

/**
 * 360°-os videó: lejátszás előtt egyértelmű indító-felület jelenik meg
 * (nagy lejátszás gomb + felirat), nem pedig egy „magától értetődő" bélyegkép.
 * Kattintásra indul: YouTube-nál autoplay-os beágyazás, fájlnál beépített lejátszó.
 */
export default function ProductVideo({
  videoUrl,
  poster,
  title,
}: ProductVideoProps) {
  const [started, setStarted] = useState(false);

  const youtubeId = getYouTubeId(videoUrl);
  const youtube = youtubeId ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : null;
  const isFile = isVideoFile(videoUrl);

  // Nem beágyazható link — külső megnyitás
  if (!youtube && !isFile) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-700 px-5 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
      >
        <Video className="h-4 w-4" />
        Videó megnyitása új lapon
      </a>
    );
  }

  // Lejátszás közben: YouTube beágyazás vagy fájl-lejátszó
  if (started) {
    if (youtube) {
      // - vq=highres: a legmagasabb elérhető minőséget kéri a lejátszó
      // - mute=1: a videó mindig némítva indul (a látogató kattintására
      //   induló autoplayt a böngésző egyébként hanggal engedné)
      // - loop=1 + playlist=<id>: a körbeforgatás végtelen hurokban ismétlődik
      //   (a YouTube csak így, a playlist paraméterrel hajlandó loopolni)
      // - controls=0: a YouTube összes gombja elrejtve — magára a videóra
      //   kattintva vált a lejátszó lejátszás/szünet között (natív viselkedés)
      // - modestbranding/rel=0/iv_load_policy=3/fs=0: nincs branding,
      //   ajánlott videó, felirat-ikon vagy teljes képernyő gomb
      // - sandbox (allow-scripts + allow-same-origin + allow-presentation):
      //   a YouTube belső linkjei („Megnyitás a YouTube-on") és popupok
      //   blokkolva — a videó kizárólag beágyazva nézhető, nem nyitható meg
      //   a YouTube-on (allow-top-navigation / allow-popups nélkül)
      const params = new URLSearchParams({
        autoplay: "1",
        vq: "highres",
        mute: "1",
        loop: "1",
        playlist: youtubeId!,
        controls: "0",
        modestbranding: "1",
        rel: "0",
        iv_load_policy: "3",
        playsinline: "1",
        fs: "0",
      });
      return (
        <iframe
          src={`${youtube}?${params.toString()}`}
          title={`${title} — 360°-os videó`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="aspect-video w-full rounded-xl border border-zinc-800 bg-black"
        />
      );
    }
    return (
      <video
        controls
        autoPlay
        loop
        className="aspect-video w-full rounded-xl border border-zinc-800 bg-black"
      >
        <source src={videoUrl} />
        A böngésződ nem támogatja a videólejátszást.
      </video>
    );
  }

  // Indító-felület: elhalványított kép + egyértelmű lejátszás gomb
  return (
    <button
      type="button"
      onClick={() => setStarted(true)}
      aria-label={`${title} — 360°-os videó lejátszása`}
      className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-black text-left"
    >
      {poster && (
        <Image
          src={poster}
          alt=""
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover opacity-50 transition-opacity duration-500 group-hover:opacity-40"
        />
      )}

      {/* Sötét átmenet, hogy a gomb és a felirat jól olvasható maradjon */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/20" />

      <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        {/* Lejátszás gomb lágy pulzáló gyűrűvel */}
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/25 [animation-duration:2.2s]" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/40 ring-1 ring-amber-300/60 transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </span>

        <span className="rounded-full border border-zinc-700/60 bg-zinc-950/75 px-5 py-2 text-sm font-medium text-zinc-100 backdrop-blur-sm transition-colors duration-300 group-hover:border-amber-600/60 group-hover:text-amber-400">
          360°-os videó lejátszása
        </span>
      </span>
    </button>
  );
}
