"use client";

import { useCallback, useEffect, useState } from "react";
import { Hammer, Trash2, Upload } from "lucide-react";
import { cardThumbUrlFor } from "@/lib/imageUrls";

interface CurrentProject {
  id: number;
  title: string;
  description: string;
  image: string;
  progress: number;
  updatedAt: string;
}

export default function AdminCurrentProject() {
  const [project, setProject] = useState<CurrentProject | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [progress, setProgress] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/current-project");
      if (!res.ok) throw new Error();
      const json = await res.json();
      const p: CurrentProject | null = json.project ?? null;
      setProject(p);
      setTitle(p?.title ?? "");
      setDescription(p?.description ?? "");
      setImage(p?.image ?? "");
      setProgress(String(p?.progress ?? 0));
    } catch {
      setError("Nem sikerült betölteni a jelenlegi projektet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        setError("A kép feltöltése sikertelen.");
        return;
      }
      setImage(json.url as string);
    } catch {
      setError("A kép feltöltése sikertelen.");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Add meg a projekt címét.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/current-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image,
          progress: Number(progress) || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Hiba.");
        return;
      }
      await load();
    } catch {
      setError("Hiba történt a mentéskor.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Biztosan eltávolítod a jelenlegi projektet?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/current-project", { method: "DELETE" });
      if (res.ok) {
        setProject(null);
        setTitle("");
        setDescription("");
        setImage("");
        setProgress("0");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={save}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      >
        <h3 className="text-sm font-semibold text-zinc-200">
          Jelenlegi projekt
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Egyszerre csak egy projekt jelenik meg a főoldalon. A mentés
          felülírja a korábbit.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-zinc-400">Cím</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="pl. Festett szobor megrendelésre"
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-zinc-400">
              Leírás (opcionális)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Rövid szöveg a munkáról…"
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-400">
              Készültség (%)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none focus:border-amber-600/60"
            />
          </label>

          <div className="block">
            <span className="text-xs font-medium text-zinc-400">Kép</span>
            <div className="mt-1.5 flex items-center gap-3">
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-200 transition-colors hover:border-amber-600/60">
                <Upload className="h-4 w-4" />
                {uploading ? "Feltöltés…" : "Kép kiválasztása"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </label>
              {image && (
                <span className="truncate text-xs text-zinc-500">
                  Kép kiválasztva
                </span>
              )}
            </div>
          </div>
        </div>

        {image && (
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardThumbUrlFor(image)}
              alt="Előnézet"
              className="aspect-[4/3] w-full max-w-xs object-cover"
            />
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:opacity-60"
          >
            <Hammer className="h-4 w-4" />
            {saving ? "Mentés…" : "Mentés"}
          </button>
          {project && (
            <button
              type="button"
              disabled={saving}
              onClick={remove}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-700 px-5 text-sm font-medium text-zinc-300 transition-colors hover:border-red-600/50 hover:text-red-400 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Eltávolítás
            </button>
          )}
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
        </div>
      )}
    </div>
  );
}
