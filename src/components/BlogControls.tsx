"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const DEFAULT_PER = 9;

export default function BlogControls({
  perPageOptions = [9, 12, 18, 24],
}: {
  perPageOptions?: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const urlPer = Number(searchParams.get("perPage")) || DEFAULT_PER;

  const [q, setQ] = useState(urlQ);
  const [per, setPer] = useState(urlPer);

  // Külső URL-változás (pl. lapozás, vissza gomb) esetén szinkronizálunk.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(urlQ);
    setPer(urlPer);
  }, [urlQ, urlPer]);

  const push = (nextQ: string, nextPer: number) => {
    const sp = new URLSearchParams();
    if (nextQ.trim()) sp.set("q", nextQ.trim());
    if (nextPer !== DEFAULT_PER) sp.set("perPage", String(nextPer));
    sp.set("page", "1");
    router.push(`/blog?${sp.toString()}`);
  };

  // Keresés: 400 ms debounce, csak ha tényleg változott az URL-hez képest.
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => push(q, per), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Keresés a bejegyzések között…"
        className="h-10 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none focus:border-amber-600"
      />
      <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-400">
        Oldalanként:
        <select
          value={per}
          onChange={(e) => {
            const v = Number(e.target.value);
            setPer(v);
            push(q, v);
          }}
          className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-amber-600"
        >
          {perPageOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
