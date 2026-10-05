"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Wrench } from "lucide-react";

interface MaintenanceState {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
}

const DEFAULT_MESSAGE =
  "Karbantartás miatt az oldal átmenetileg nem elérhető. Hamarosan visszatérünk!";

export default function AdminMaintenance() {
  const [state, setState] = useState<MaintenanceState>({
    enabled: false,
    message: DEFAULT_MESSAGE,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"on" | "off" | "text" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenance", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const m = json.maintenance as MaintenanceState | undefined;
      if (m) {
        setState({
          enabled: m.enabled,
          message: m.message || DEFAULT_MESSAGE,
          updatedAt: m.updatedAt ?? null,
        });
      }
    } catch {
      setError("Nem sikerült betölteni a karbantartás beállításait.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const save = async (next: {
    enabled: boolean;
    message: string;
    kind: "on" | "off" | "text";
  }) => {
    setSaving(next.kind);
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: next.enabled,
          message: next.message,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : "Hiba a mentéskor.");
        return;
      }
      const m = json.maintenance as MaintenanceState | undefined;
      if (m) {
        setState({
          enabled: m.enabled,
          message: m.message || DEFAULT_MESSAGE,
          updatedAt: m.updatedAt ?? null,
        });
      }
    } catch {
      setError("Hiba történt a mentéskor.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        {/* Kapcsoló sor */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Wrench className="h-4 w-4 text-amber-500" />
              Karbantartás mód
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Bekapcsolva a weboldal minden oldala helyett egy tájékoztató
              jelenik meg. Az admin felület és a bejelentkezett admin elérhető
              marad.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={state.enabled}
            disabled={saving !== null}
            onClick={() =>
              void save({
                enabled: !state.enabled,
                message: state.message,
                kind: state.enabled ? "off" : "on",
              })
            }
            className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
              state.enabled ? "bg-amber-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-zinc-950 shadow transition-transform ${
                state.enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Állapotsáv */}
        <div className="mt-4">
          {state.enabled ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-600/50 bg-amber-600/10 px-4 py-1.5 text-xs font-medium text-amber-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              AKTÍV — a látogatók csak a tájékoztatót látják
            </p>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-400">
            Kikapcsolva — az oldal elérhető
          </p>
        )}
        </div>

        {/* Szövegszerkesztő */}
        <div className="mt-6">
          <label className="block">
            <span className="text-xs font-medium text-zinc-400">
              Tájékoztató szöveg (a látogatók ezt látják)
            </span>
            <textarea
              value={state.message}
              onChange={(e) =>
                setState((s) => ({ ...s, message: e.target.value }))
              }
              rows={5}
              placeholder={DEFAULT_MESSAGE}
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving !== null}
              onClick={() =>
                void save({
                  enabled: state.enabled,
                  message: state.message,
                  kind: "text",
                })
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving === "text" ? "Mentés…" : "Szöveg mentése"}
            </button>
            {state.updatedAt && (
              <span className="text-xs text-zinc-500">
                Utolsó módosítás:{" "}
                {new Date(state.updatedAt).toLocaleString("hu-HU")}
              </span>
            )}
            {saving === "on" && (
              <span className="text-xs text-zinc-500">Bekapcsolás…</span>
            )}
            {saving === "off" && (
              <span className="text-xs text-zinc-500">Kikapcsolás…</span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
