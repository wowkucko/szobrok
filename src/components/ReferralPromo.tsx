"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Gift,
  Link2,
  PartyPopper,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";

interface Status {
  code: string;
  clicks: number;
  unlocked: boolean;
  coupon: string;
  couponDiscount: number | null;
}

const OWNER_COOKIE = "ref_owner_code";

function getOwnerCode(): string | null {
  const found = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${OWNER_COOKIE}=`));
  return found ? decodeURIComponent(found.split("=")[1] ?? "") : null;
}

function setOwnerCode(code: string) {
  document.cookie = `${OWNER_COOKIE}=${encodeURIComponent(
    code
  )}; max-age=31536000; path=/; samesite=lax`;
}

export default function ReferralPromo({ minClicks }: { minClicks: number }) {
  const [ownerCode, setOwner] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState<"link" | "coupon" | null>(null);
  const pollRef = useRef<number | null>(null);

  const loadStatus = useCallback(async (code: string) => {
    const res = await fetch(
      `/api/referral/status?code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const json = await res.json();
      setStatus(json);
      return json as Status;
    }
    return null;
  }, []);

  useEffect(() => {
    const code = getOwnerCode();
    if (code) {
      setOwner(code);
      const url = `${window.location.origin}/?ref=${code}`;
      setShareUrl(url);
      void loadStatus(code);
    }
  }, [loadStatus]);

  // Polling: amíg nincs feloldva, rendszeresen frissítjük a kattintásokat.
  useEffect(() => {
    if (!ownerCode || status?.unlocked) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      return;
    }
    pollRef.current = window.setInterval(() => {
      void loadStatus(ownerCode);
    }, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [ownerCode, status?.unlocked, loadStatus]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/referral/create", { method: "POST" });
      if (!res.ok) return;
      const { code } = await res.json();
      setOwner(code);
      setOwnerCode(code);
      const url = `${window.location.origin}/?ref=${code}`;
      setShareUrl(url);
      await loadStatus(code);
    } finally {
      setCreating(false);
    }
  }

  function shareFacebook() {
    if (!shareUrl) return;
    const u = encodeURIComponent(shareUrl);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      "_blank",
      "noopener,noreferrer,width=600,height=600"
    );
  }

  async function copy(text: string, which: "link" | "coupon") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // a böngésző megtagadta — marad a kézi másolás
    }
  }

  const progress = status
    ? Math.min(100, Math.round((status.clicks / minClicks) * 100))
    : 0;
  const remaining = status ? Math.max(0, minClicks - status.clicks) : minClicks;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 shadow-2xl sm:p-10">
      {!ownerCode ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600/15 border border-amber-600/25">
            <Gift className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-100">
            Készítsd el a saját megosztó linkedet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Egy kattintás, és generálunk neked egy egyedi linket. Oszd meg
            Facebookon — ha {minClicks} ember rákattint, máris megkapod a
            kedvezményes kuponkódot. Regisztráció nélkül.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-amber-600 px-7 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:opacity-60"
          >
            {creating ? "Készítés…" : "Saját link létrehozása"}
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div>
          {/* Lépések */}
          <ol className="grid gap-3 sm:grid-cols-3">
            <Step
              n={1}
              done={!!status}
              title="Link kész"
              text="Megvan a saját megosztó linked."
            />
            <Step
              n={2}
              done={status?.clicks ? status.clicks > 0 : false}
              title="Oszd meg"
              text="Posztold Facebook profilodon vagy csoportokban."
            />
            <Step
              n={3}
              done={status?.unlocked ?? false}
              title="Kupon"
              text={`${minClicks} kattintás után feloldódik.`}
            />
          </ol>

          {/* Megosztó kártya */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              A te megosztó linked
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
                <Link2 className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate">{shareUrl}</span>
              </div>
              <button
                onClick={() => copy(shareUrl, "link")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                {copied === "link" ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" /> Másolva
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Másolás
                  </>
                )}
              </button>
              <button
                onClick={shareFacebook}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Share2 className="h-4 w-4" /> Megosztás
              </button>
            </div>
          </div>

          {/* Haladás */}
          {!status?.unlocked && (
            <div className="mt-8">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-300">
                  {status ? status.clicks : 0} / {minClicks} kattintás
                </span>
                <span className="text-zinc-500">
                  {remaining > 0
                    ? `Még ${remaining} kattintás és a tiéd a kupon`
                    : "Kupon feloldva!"}
                </span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                A számláló automatikusan frissül, ahogy az ismerőseid
                rákattintanak a linkre.
              </p>
            </div>
          )}

          {/* Feloldva */}
          {status?.unlocked && (
            <div className="mt-8 rounded-2xl border border-amber-600/30 bg-amber-600/10 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600/20">
                <PartyPopper className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-100">
                Gratulálunk! Megvan a kuponkódod
              </h3>
              {status.couponDiscount != null && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400">
                  <Tag className="h-4 w-4" />
                  {status.couponDiscount}% kedvezmény
                </div>
              )}
              <div className="mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-xl border border-amber-500/40 bg-zinc-950 px-5 py-4">
                <code className="flex-1 text-center text-xl font-bold tracking-[0.2em] text-amber-400">
                  {status.coupon}
                </code>
                <button
                  onClick={() => copy(status.coupon, "coupon")}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-xs font-medium text-zinc-950 transition-colors hover:bg-amber-500"
                >
                  {copied === "coupon" ? (
                    <>
                      <Check className="h-4 w-4" /> Másolva
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Másol
                    </>
                  )}
                </button>
              </div>
              <p className="mt-4 text-sm text-zinc-400">
                Add meg ezt a kódot a megrendelésnél, és érvényes a kedvezmény.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Step({
  n,
  done,
  title,
  text,
}: {
  n: number;
  done: boolean;
  title: string;
  text: string;
}) {
  return (
    <li
      className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
        done
          ? "border-amber-600/30 bg-amber-600/5"
          : "border-zinc-800 bg-zinc-950/40"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          done
            ? "bg-amber-600 text-zinc-950"
            : "bg-zinc-800 text-zinc-400"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </span>
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">{text}</p>
      </div>
    </li>
  );
}
