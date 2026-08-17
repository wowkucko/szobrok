"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, X } from "lucide-react";

interface ImageListFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** A bélyegképként megjelölt kép URL-je. */
  thumbnail?: string;
  /** Bélyegkép bejelölése (url). */
  onThumbnailChange?: (url: string) => void;
  hint?: string;
}

/** Kép lista mező: egyben feltöltés, előnézet, bélyegkép-jelölés, törlés. */
export default function ImageListField({
  value,
  onChange,
  thumbnail,
  onThumbnailChange,
  hint,
}: ImageListFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressInfo, setCompressInfo] = useState<string | null>(null);
  const [ogInfo, setOgInfo] = useState<string | null>(null);

  /** Több kép egyszerre feltöltése (egyesével, sorrendben). */
  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setCompressInfo(null);
    setOgInfo(null);
    try {
      const kb = (bytes: number) => Math.max(1, Math.round(bytes / 1024));
      const results: string[] = [];
      let lastInfo: string | null = null;
      let lastOg = false;
      let firstError: string | null = null;

      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const data = (await res.json().catch(() => null)) as
          | {
              url?: string;
              error?: string;
              optimized?: boolean;
              sizeBytes?: number;
              ogUrl?: string | null;
            }
          | null;
        if (!res.ok || !data?.url) {
          firstError ??=
            data?.error ?? `A(z) „${file.name}" feltöltése sikertelen.`;
          continue;
        }
        results.push(data.url);
        // Minőségtartó tömörítés visszajelzése (az utolsó fájl adata).
        if (data.optimized && data.sizeBytes) {
          const saved = Math.max(0, kb(file.size) - kb(data.sizeBytes));
          lastInfo = `Automatikusan tömörítve minőségvesztés nélkül: ${kb(
            file.size
          )} KB → ${kb(data.sizeBytes)} KB (${saved} KB megtakarítás)`;
        } else {
          lastInfo = `Feltöltve ${kb(data.sizeBytes ?? file.size)} KB (a fájl már optimális volt)`;
        }
        if (data.ogUrl) lastOg = true;
      }

      if (results.length > 0) {
        // Az összes új kép egyszerre kerül a listába (nem egymást felülírva).
        onChange([...value, ...results]);
        // Az első feltöltött kép automatikusan bélyegkép lesz.
        if (value.length === 0 && onThumbnailChange) {
          onThumbnailChange(results[0]);
        }
        if (files.length > 1) {
          lastInfo = `${results.length} kép feltöltve — ${lastInfo ?? ""}`.trim();
        }
      }

      if (firstError) setError(firstError);
      setCompressInfo(lastInfo);
      if (lastOg) {
        setOgInfo(
          "OG-megosztási kép (1200×630 PNG) automatikusan generálva a közösségi megosztáshoz."
        );
      }
    } catch {
      setError("Hiba történt a feltöltés közben.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (index: number) => {
    const removed = value[index];
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    // Ha épp a bélyegképet töröltük, az első megmaradt kép lesz a bélyegkép.
    if (removed === thumbnail && onThumbnailChange) {
      onThumbnailChange(next[0] ?? "");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) void upload(files);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 text-sm text-zinc-300 transition-colors hover:border-amber-600/70 hover:text-amber-500 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {uploading ? "Feltöltés…" : "Kép(ek) feltöltése"}
        </button>
        {value.length > 0 && (
          <span className="text-xs text-zinc-500">
            {value.length} kép — a csillaggal jelöld be a bélyegképet
          </span>
        )}
        <span className="text-xs text-zinc-600">
          Több kép is kijelölhető egyszerre (Ctrl/Cmd + kattintás)
        </span>
      </div>
      {hint && <p className="mt-1.5 text-xs text-zinc-600">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {compressInfo && (
        <p className="mt-1.5 text-xs text-emerald-400">{compressInfo}</p>
      )}
      {ogInfo && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400/90">
          <Star className="h-3 w-3" />
          {ogInfo}
        </p>
      )}
      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((src, i) => {
            const isThumb = src === thumbnail;
            return (
              <div
                key={`${src}-${i}`}
                className={`group relative aspect-square overflow-hidden rounded-lg border bg-zinc-950/60 ${
                  isThumb ? "border-amber-500 ring-2 ring-amber-500/30" : "border-zinc-800"
                }`}
              >
                <Image
                  src={src}
                  alt={`Kép ${i + 1}`}
                  width={160}
                  height={160}
                  unoptimized
                  className="h-full w-full object-cover"
                />

                {/* Bélyegkép jelölés */}
                <button
                  type="button"
                  onClick={() => onThumbnailChange?.(src)}
                  disabled={!onThumbnailChange}
                  title={
                    isThumb
                      ? "Ez a bélyegkép"
                      : "Bélyegképnek jelölés"
                  }
                  aria-label={
                    isThumb
                      ? `${i + 1}. kép a bélyegkép`
                      : `${i + 1}. kép bejelölése bélyegképnek`
                  }
                  className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[10px] font-medium shadow transition-colors disabled:cursor-default ${
                    isThumb
                      ? "bg-amber-600 text-zinc-950"
                      : "bg-zinc-950/85 text-zinc-400 opacity-0 hover:text-amber-400 group-hover:opacity-100 disabled:opacity-0"
                  }`}
                >
                  <Star
                    className="h-3 w-3"
                    fill={isThumb ? "currentColor" : "none"}
                  />
                  {isThumb && "Bélyegkép"}
                </button>

                {/* Törlés */}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`${i + 1}. kép eltávolítása`}
                  className="absolute right-1.5 top-1.5 rounded-full bg-zinc-950/85 p-1 text-zinc-300 opacity-0 shadow transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <span className="absolute bottom-1 left-1 rounded bg-zinc-950/85 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {i + 1}.
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
