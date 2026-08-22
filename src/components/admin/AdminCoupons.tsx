"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Power, Trash2 } from "lucide-react";

interface Coupon {
  code: string;
  label: string;
  discount: number;
  active: boolean;
  uses: number;
  createdAt: string;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [discount, setDiscount] = useState("10");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCoupons(json.coupons ?? []);
    } catch {
      setError("Nem sikerült betölteni a kuponokat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Add meg a kupon kódját.");
      return;
    }
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          label,
          discount: Number(discount) || 10,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Hiba.");
        return;
      }
      setCode("");
      setLabel("");
      setDiscount("10");
      await load();
    } catch {
      setError("Hiba történt a létrehozáskor.");
    }
  };

  const toggle = async (c: Coupon) => {
    setBusyCode(c.code);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c.code, active: !c.active }),
      });
      if (res.ok) {
        setCoupons((prev) =>
          prev.map((x) =>
            x.code === c.code ? { ...x, active: !x.active } : x
          )
        );
      }
    } finally {
      setBusyCode(null);
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Biztosan törlöd a(z) ${c.code} kupont?`)) return;
    setBusyCode(c.code);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c.code }),
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((x) => x.code !== c.code));
      }
    } finally {
      setBusyCode(null);
    }
  };

  const activeCount = coupons.filter((c) => c.active).length;

  return (
    <div className="space-y-8">
      {/* Új kupon */}
      <form
        onSubmit={create}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      >
        <h3 className="text-sm font-semibold text-zinc-200">Új kupon</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-medium text-zinc-400">Kód</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder=""
              autoCapitalize="characters"
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm uppercase text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-medium text-zinc-400">
              Megjegyzés (opcionális)
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="pl. Facebook akció"
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>
          <label className="block w-28">
            <span className="text-xs font-medium text-zinc-400">Kedvezmény %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" />
            Létrehozás
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16 text-center text-sm text-zinc-500">
          Még nincs kupon. Hozz létre egyet fent.
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            {activeCount} aktív / {coupons.length} összesen
          </p>
          <ul className="space-y-3">
            {coupons.map((c) => (
              <li
                key={c.code}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4"
              >
                <code className="text-base font-semibold tracking-wider text-amber-400">
                  {c.code}
                </code>
                {c.label && (
                  <span className="text-sm text-zinc-400">{c.label}</span>
                )}
                <span className="rounded-full bg-amber-600/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  {c.discount}% kedvezmény
                </span>
                <span className="text-xs text-zinc-500">
                  {c.uses}× használva
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyCode === c.code}
                    onClick={() => toggle(c)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
                      c.active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {c.active ? "Aktív" : "Inaktív"}
                  </button>
                  <button
                    type="button"
                    disabled={busyCode === c.code}
                    onClick={() => remove(c)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 transition-colors hover:border-red-600/50 hover:text-red-400 disabled:opacity-50"
                    title="Törlés"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
