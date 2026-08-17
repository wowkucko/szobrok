"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  Ruler,
  Save,
  Tag as TagIcon,
  X,
} from "lucide-react";
import type { ProductDetail } from "@/types/product";
import RichTextEditor from "@/components/admin/RichTextEditor";
import ImageListField from "@/components/admin/ImageListField";
import CategoryCombobox from "@/components/admin/CategoryCombobox";

interface ProductFormProps {
  mode: "create" | "edit";
  product?: ProductDetail;
  tagOptions: string[];
  /** A használatban lévő kategóriák (a választó javaslatai). */
  categoryOptions: string[];
}

interface FormValues {
  title: string;
  shortDescription: string;
  price: string;
  currency: string;
  heightCm: string;
  widthCm: string;
  depthCm: string;
  scale: string;
  tags: string[];
  category: string;
  images: string[];
  thumbnail: string;
  createdAt: string;
  isAvailable: boolean;
  featured: boolean;
  isShippable: boolean;
  descriptionHtml: string;
  videoUrl: string;
  materials: string[];
  printTechnology: string;
}

const CATEGORIES = ["Fantasy", "Sci-Fi", "Cyberpunk", "Horror", "Other"];
const TECHNOLOGIES = ["MSLA Resin (12K)", "FDM (0.08 mm)"];

const MATERIAL_OPTIONS = [
  "Prémium ABS-like műgyanta (8K MSLA nyomtatás)",
  "PLA/PETG filament (FDM nyomtatás)",
  "Vallejo & Citadel akril festékek",
  "The Army Painter Warpaints Fanatic prémium akrilfesték",
  "UV-álló szatén védőlakk",
  "Matt védőlakk",
  "Fényes lakk",
  "Kétkomponensű epoxy ragasztó",
];

// Gyakori méretarányok, amikre a magasságból kerekítünk
const COMMON_SCALES = [4, 6, 8, 10, 12, 16, 24, 32, 48, 64];

/** Méretarány a magasságból (kb. 180 cm-es referencia-figura alapján). */
function autoScale(heightCm: number): string | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const n = 180 / heightCm;
  let best = COMMON_SCALES[0];
  let bestDist = Infinity;
  for (const s of COMMON_SCALES) {
    const d = Math.abs(Math.log(n / s));
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return `1:${best}`;
}

function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.trim());
}

export default function ProductForm({
  mode,
  product,
  tagOptions,
  categoryOptions,
}: ProductFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState("");

  const [values, setValues] = useState<FormValues>(() =>
    product
      ? {
          title: product.title,
          shortDescription: product.shortDescription,
          price: String(product.price),
          currency: product.currency,
          heightCm: String(product.dimensions.heightCm || ""),
          widthCm: String(product.dimensionsDetail.widthCm || ""),
          depthCm: String(product.dimensionsDetail.depthCm || ""),
          scale: product.dimensions.scale ?? "",
          tags: product.tags,
          category: product.category,
          images: product.images,
          thumbnail: product.thumbnail ?? product.images[0] ?? "",
          createdAt: product.createdAt,
          isAvailable: product.isAvailable,
          featured: product.featured ?? false,
          isShippable: product.isShippable ?? false,
          descriptionHtml: product.descriptionHtml,
          videoUrl: product.videoUrl ?? "",
          materials: product.materials,
          printTechnology: product.printTechnology,
        }
      : {
          title: "",
          shortDescription: "",
          price: "",
          currency: "HUF",
          heightCm: "",
          widthCm: "",
          depthCm: "",
          scale: "",
          tags: [],
          category: "Fantasy",
          images: [],
          thumbnail: "",
          createdAt: new Date().toISOString(),
          isAvailable: true,
          featured: false,
          isShippable: false,
          descriptionHtml: "",
          videoUrl: "",
          materials: [],
          printTechnology: "MSLA Resin (12K)",
        }
  );

  const update = <K extends keyof FormValues,>(key: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  /** Magasság módosítása + méretarány automatikus újraszámítása. */
  const updateHeight = (height: string) =>
    setValues((v) => {
      const s = autoScale(parseFloat(height));
      return { ...v, heightCm: height, scale: s ?? v.scale };
    });

  const toggleInList = (key: "tags" | "materials", item: string) =>
    setValues((v) => {
      const list = v[key];
      return {
        ...v,
        [key]: list.includes(item)
          ? list.filter((x) => x !== item)
          : [...list, item],
      };
    });

  const addCustomTags = () => {
    const added = customTag
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (added.length === 0) return;
    setValues((v) => ({
      ...v,
      tags: [...v.tags, ...added.filter((t) => !v.tags.includes(t))],
    }));
    setCustomTag("");
  };

  /** Címke áthelyezése a listában (a kártyán az első 3 jelenik meg). */
  const moveTag = (index: number, dir: -1 | 1) =>
    setValues((v) => {
      const target = index + dir;
      if (target < 0 || target >= v.tags.length) return v;
      const tags = [...v.tags];
      [tags[index], tags[target]] = [tags[target], tags[index]];
      return { ...v, tags };
    });

  const uploadVideo = async (file: File) => {
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "A videó feltöltése sikertelen.");
        return;
      }
      update("videoUrl", data.url);
    } catch {
      setError("Hiba történt a videó feltöltése közben.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!values.title.trim()) {
      setError("A cím kötelező.");
      return;
    }
    const price = Number(values.price);
    if (!Number.isFinite(price) || price < 0) {
      setError("Az árnak érvényes, nemnegatív számnak kell lennie.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: values.title.trim(),
        shortDescription: values.shortDescription.trim(),
        price,
        currency: values.currency,
        heightCm: Number(values.heightCm) || 0,
        widthCm: Number(values.widthCm) || 0,
        depthCm: Number(values.depthCm) || 0,
        scale: values.scale.trim() || null,
        tags: values.tags,
        category: values.category,
        images: values.images,
        thumbnail: values.thumbnail || values.images[0] || "",
        createdAt: values.createdAt,
        isAvailable: values.isAvailable,
        featured: values.featured,
        isShippable: values.isShippable,
        descriptionHtml: values.descriptionHtml,
        videoUrl: values.videoUrl.trim() || null,
        materials: values.materials,
        printTechnology: values.printTechnology,
      };

      const res = await fetch("/api/admin/products", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "edit" ? { id: product!.id, ...payload } : payload
        ),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Hiba történt a mentés közben.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Hiba történt a mentés közben.");
    } finally {
      setSaving(false);
    }
  };

  const materialOptions = [
    ...MATERIAL_OPTIONS,
    ...values.materials.filter((m) => !MATERIAL_OPTIONS.includes(m)),
  ];

  // A kategória-választó javaslatai: az alapértelmezett 5 + a már használatban
  // lévő (dinamikusan bővülő) kategóriák. Újat is be lehet írni szabadon.
  const categoryChoices = [
    ...new Set([...CATEGORIES, ...categoryOptions]),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ===== Alapadatok ===== */}
      <Section title="Alapadatok">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cím *" className="sm:col-span-2">
            <TextInput
              value={values.title}
              onChange={(v) => update("title", v)}
              placeholder="pl. Nekomata Kunoichi — Kézzel festett műgyanta bust"
              required
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Kategória
            </span>
            <CategoryCombobox
              value={values.category}
              onChange={(v) => update("category", v)}
              options={categoryChoices}
              placeholder="pl. Fantasy, Sci-Fi — vagy új kategória…"
            />
            <span className="mt-1.5 block text-xs text-zinc-600">
              Válassz a meglévőkből, vagy írj be újat — az új kategória mentéskor
              automatikusan létrejön.
            </span>
          </div>

          <Field label="Ár *">
            <TextInput
              value={values.price}
              onChange={(v) => update("price", v)}
              type="number"
              min={0}
              step={100}
              placeholder="45000"
              required
            />
          </Field>

          <Field label="Pénznem">
            <Select
              value={values.currency}
              onChange={(v) => update("currency", v)}
              options={["HUF", "EUR"]}
            />
          </Field>

          {/* Méretek: mindegyik opcionális, cm-ben */}
          <div className="sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Ruler className="h-3.5 w-3.5" />
              Méretek (cm) — mindegyik opcionális
            </span>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextInput
                value={values.heightCm}
                onChange={updateHeight}
                type="number"
                min={0}
                step={0.1}
                placeholder="Magasság"
                aria-label="Magasság (cm)"
              />
              <TextInput
                value={values.widthCm}
                onChange={(v) => update("widthCm", v)}
                type="number"
                min={0}
                step={0.1}
                placeholder="Szélesség"
                aria-label="Szélesség (cm)"
              />
              <TextInput
                value={values.depthCm}
                onChange={(v) => update("depthCm", v)}
                type="number"
                min={0}
                step={0.1}
                placeholder="Mélység"
                aria-label="Mélység (cm)"
              />
            </div>
          </div>

          <Field
            label="Méretarány"
            hint="Automatikusan a magasságból számolva — kézzel felülírható."
          >
            <TextInput
              value={values.scale}
              onChange={(v) => update("scale", v)}
              placeholder="pl. 1:8"
            />
          </Field>

          <Field
            label="Feltöltés dátuma"
            hint="Automatikusan a jelenlegi időpont (ISO)."
          >
            <div className="flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-500">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span className="truncate">{values.createdAt}</span>
            </div>
          </Field>

          <Field label="Rövid leírás" className="sm:col-span-2">
            <TextArea
              value={values.shortDescription}
              onChange={(v) => update("shortDescription", v)}
              rows={3}
              placeholder="Egy-két mondat, ami a kártyán megjelenik."
            />
          </Field>

          {/* Címkék */}
          <div className="sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <TagIcon className="h-3.5 w-3.5" />
              Címkék
            </span>
            {values.tags.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs text-zinc-600">
                  A kártyán az{" "}
                  <span className="font-medium text-amber-500">első 3 címke</span>{" "}
                  jelenik meg — a nyilakkal rendezd a sorrendet.
                </p>
                <ul className="space-y-1.5">
                  {values.tags.map((tag, index) => {
                    const onCard = index < 3;
                    return (
                      <li
                        key={tag}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                          onCard
                            ? "border-amber-600/40 bg-amber-600/5"
                            : "border-zinc-800 bg-zinc-950/40"
                        }`}
                      >
                        <span
                          className={`w-5 shrink-0 text-right text-[11px] tabular-nums ${
                            onCard ? "text-amber-500" : "text-zinc-600"
                          }`}
                        >
                          {index + 1}.
                        </span>
                        <span
                          className={`flex-1 truncate text-sm ${
                            onCard ? "text-amber-500" : "text-zinc-300"
                          }`}
                        >
                          {tag}
                        </span>
                        {onCard && (
                          <span className="hidden shrink-0 rounded-full border border-amber-600/40 px-2 py-0.5 text-[10px] text-amber-500 sm:inline">
                            az előnézeten
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveTag(index, -1)}
                          aria-label={`${tag} feljebb mozgatása`}
                          title="Feljebb"
                          className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === values.tags.length - 1}
                          onClick={() => moveTag(index, 1)}
                          aria-label={`${tag} lejjebb mozgatása`}
                          title="Lejjebb"
                          className="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleInList("tags", tag)}
                          aria-label={`${tag} címke eltávolítása`}
                          title="Eltávolítás"
                          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-red-600/10 hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {tagOptions
                .filter((tag) => !values.tags.includes(tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInList("tags", tag)}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-amber-600/70 hover:text-amber-500"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTags();
                  }
                }}
                placeholder="Új címke hozzáadása…"
                className="h-9 w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomTags}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-600/70 hover:text-amber-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Hozzáadás
              </button>
            </div>
          </div>

          {/* Képek: minden kép egyben, a bélyegkép bejelölve */}
          <Field
            label="Képek"
            className="sm:col-span-2"
            hint="Az összes kép egyben tölthető fel — a kártyán, a részletező galériájában és a feedben is ezek jelennek meg."
          >
            <ImageListField
              value={values.images}
              onChange={(v) => update("images", v)}
              thumbnail={values.thumbnail}
              onThumbnailChange={(url) => update("thumbnail", url)}
              hint="Kép típusú fájlok tölthetők fel (jpg, png, webp, gif, svg). A csillaggal jelöld be, melyik legyen a bélyegkép — ha nincs bejelölve, az első kép lesz az."
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-6">
          <Toggle
            label="Kiemelt a főoldalon"
            checked={values.featured}
            onChange={(v) => update("featured", v)}
            accent="amber"
          />
          <Toggle
            label="Elérhető / megvásárolható"
            checked={values.isAvailable}
            onChange={(v) => update("isAvailable", v)}
            accent="emerald"
          />
          <Toggle
            label="Szállítható (csomagautomatába is)"
            checked={values.isShippable}
            onChange={(v) => update("isShippable", v)}
            accent="sky"
          />
        </div>
      </Section>

      {/* ===== Részletező ===== */}
      <Section title="Részletező oldal">
        <Field label="Részletes leírás">
          <RichTextEditor
            value={values.descriptionHtml}
            onChange={(v) => update("descriptionHtml", v)}
          />
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nyomtatási technológia">
            <Select
              value={values.printTechnology}
              onChange={(v) => update("printTechnology", v)}
              options={TECHNOLOGIES}
            />
          </Field>

          <Field
            label="Anyagok (több is választható)"
            hint="Kattints a listából — a kiválasztottak megjelennek a termékoldalon."
          >
            <div className="flex flex-wrap gap-2">
              {materialOptions.map((m) => {
                const active = values.materials.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleInList("materials", m)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-emerald-600/60 bg-emerald-600/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-400 hover:border-emerald-600/60 hover:text-emerald-400"
                    }`}
                  >
                    {active ? "✓ " : "+ "}
                    {m}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Videó: YouTube link vagy fájlfeltöltés */}
          <Field
            label="360°-os videó"
            className="sm:col-span-2"
            hint="YouTube link (beágyazva jelenik meg) vagy mp4/webm fájl feltöltése."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <TextInput
                value={values.videoUrl}
                onChange={(v) => update("videoUrl", v)}
                placeholder="https://www.youtube.com/watch?v=… vagy /api/files/…"
                className="flex-1"
              />
              <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 text-sm text-zinc-300 transition-colors hover:border-amber-600/70 hover:text-amber-500">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Videó feltöltése
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadVideo(file);
                  }}
                />
              </label>
            </div>
            {isVideoFileUrl(values.videoUrl) && (
              <video
                controls
                preload="metadata"
                src={values.videoUrl}
                className="mt-3 max-h-44 w-full rounded-lg border border-zinc-800 bg-black"
              />
            )}
          </Field>

        </div>
      </Section>

      {/* ===== Hibák + mentés ===== */}
      {error && (
        <div className="rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Termék létrehozása" : "Módosítások mentése"}
        </button>
        <a
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-3 text-sm text-zinc-300 transition-colors hover:border-amber-600 hover:text-amber-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Mégse
        </a>
      </div>
    </form>
  );
}

/* ===== Kis segédkomponensek ===== */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-zinc-600">{hint}</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none ${className}`}
      {...props}
    />
  );
}

function TextArea({
  value,
  onChange,
  className = "",
  ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none ${className}`}
      {...props}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 focus:border-amber-600/60 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  accent,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  accent: "amber" | "emerald" | "sky";
}) {
  const on =
    accent === "amber"
      ? "border-amber-600 bg-amber-600"
      : accent === "emerald"
        ? "border-emerald-600 bg-emerald-600"
        : "border-sky-600 bg-sky-600";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className={`relative h-6 w-11 rounded-full border transition-colors ${
          checked ? on : "border-zinc-700 bg-zinc-800"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-zinc-100 shadow transition-all ${
            checked ? "left-[calc(100%-1.25rem)]" : "left-0.5"
          }`}
        />
      </span>
      <span className="text-sm text-zinc-300">{label}</span>
    </button>
  );
}
