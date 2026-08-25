"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";

interface EnvEntry {
  key: string;
  value: string;
  secret: boolean;
}

export default function AdminEnv() {
  const [rows, setRows] = useState<EnvEntry[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/env", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRows(data.entries ?? []);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function setValue(key: string, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }
  function addRow() {
    const key = newKey.trim();
    if (!key) return;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      setStatus("Érvénytelen kulcs formátum.");
      return;
    }
    if (rows.some((r) => r.key === key)) {
      setStatus("Ez a kulcs már szerepel a listában.");
      return;
    }
    setRows((rs) => [...rs, { key, value: newValue, secret: /(KEY|SECRET|TOKEN|PASSWORD|PASS)/i.test(key) }]);
    setNewKey("");
    setNewValue("");
    setStatus("");
  }
  function toggleReveal(key: string) {
    setRevealed((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  async function save() {
    setSaving(true);
    setStatus("Mentés…");
    const res = await fetch("/api/admin/env", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: rows.filter((r) => r.key) }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setStatus(`Mentve. Módosítva: ${d.changed}, új: ${d.added}, törölve: ${d.removed}.`);
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setStatus(`Hiba: ${d.error ?? res.status}`);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Itt szerkesztheted a szerver <code className="text-zinc-300">.env.local</code>{" "}
        fájlját — pl. a Cults3D és Gemini kulcsokat. A mentés azonnal beírja az
        értékeket a futó folyamat környezetébe is, így a futás közben olvasott
        kulcsok (blog API-k) újraindítás nélkül érvényesülnek. A{" "}
        <code className="text-zinc-300">NEXT_PUBLIC_*</code> változók viszont
        build-időben ágyazódnak be — azoknál szükséges lehet az újraépítés /{" "}
        <code className="text-zinc-300">pm2 restart weblap</code>.
      </p>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <div className="grid grid-cols-[1fr_2fr_auto] gap-px bg-zinc-800 text-xs font-medium text-zinc-400">
          <div className="bg-zinc-950 px-4 py-2">Kulcs</div>
          <div className="bg-zinc-950 px-4 py-2">Érték</div>
          <div className="bg-zinc-950 px-4 py-2" />
        </div>
        <div className="divide-y divide-zinc-800">
          {rows.map((r) => {
            const isSecret = r.secret && !revealed.has(r.key);
            return (
              <div key={r.key} className="grid grid-cols-[1fr_2fr_auto] items-center gap-px bg-zinc-800">
                <div className="bg-zinc-950 px-4 py-2 font-mono text-xs text-zinc-300">
                  {r.key}
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 px-4 py-2">
                  <input
                    type={isSecret ? "password" : "text"}
                    value={r.value}
                    onChange={(e) => setValue(r.key, e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-amber-600"
                  />
                  {r.secret && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(r.key)}
                      aria-label={isSecret ? "Mutatás" : "Elrejtés"}
                      className="shrink-0 rounded-md border border-zinc-800 p-1.5 text-zinc-400 hover:text-amber-500"
                    >
                      {isSecret ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <div className="bg-zinc-950 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    aria-label={`${r.key} eltávolítása`}
                    className="rounded-md border border-red-700/50 p-1.5 text-red-400 hover:bg-red-700/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="bg-zinc-950 px-4 py-6 text-center text-sm text-zinc-500">
              Nincs bejegyzés a .env.local fájlban.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Új kulcs
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="PL_KEY"
            className="w-48 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-amber-600"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Érték
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="érték"
            className="w-72 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 outline-none focus:border-amber-600"
          />
        </label>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Hozzáadás
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Mentés
        </button>
        {status && <span className="text-sm text-zinc-400">{status}</span>}
      </div>
    </div>
  );
}
