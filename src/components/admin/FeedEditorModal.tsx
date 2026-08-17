"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  ImageOff,
  Loader2,
  Lock,
  Megaphone,
  Rss,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { FeedEntryFields } from "@/lib/feed";
import type { FeedImageCheck } from "@/lib/feedImages";

interface FeedEditorModalProps {
  productId: string;
  productTitle: string;
  open: boolean;
  inFeed: boolean;
  onClose: () => void;
  /** A mentés/eltávolítás után hívódik az új állapottal (van-e a feedben). */
  onSaved: (inFeed: boolean) => void;
}

type Status = "loading" | "ready" | "saving" | "error";

// ---------------------------------------------------------------------------
// A termékből AUTOMATIKUSAN töltődő mezők — csak olvashatóak (a képmezőkhöz
// hasonlóan mindig a termék aktuális adatait mutatják, sosem lehetnek
// elavultak). A feed-specifikus mezők (gtin, akciós ár, szállítás…) maradnak
// szabadon szerkeszthetők.
// ---------------------------------------------------------------------------

const DERIVED_REQUIRED: Array<{
  key: keyof FeedEntryFields;
  label: string;
  hint: string;
}> = [
  { key: "feedId", label: "id", hint: "a termék azonosítója" },
  { key: "title", label: "title", hint: "a termék címe" },
  { key: "description", label: "description", hint: "a részletes leírásból" },
  {
    key: "availability",
    label: "availability",
    hint: "a termék elérhetőségéből",
  },
  { key: "condition", label: "condition", hint: "új darab" },
  { key: "price", label: "price", hint: "a termék ára + pénznem" },
  { key: "link", label: "link", hint: "a termékoldalra mutató link" },
  { key: "imageLink", label: "image_link", hint: "a bejelölt bélyegkép" },
  { key: "brand", label: "brand", hint: "a márkanév" },
];

const DERIVED_OPTIONAL: Array<{
  key: keyof FeedEntryFields;
  label: string;
  hint: string;
}> = [
  { key: "mpn", label: "mpn", hint: "a termék azonosítója" },
  { key: "itemGroupId", label: "item_group_id", hint: "a termék azonosítója" },
  { key: "color", label: "color", hint: "kézzel festett → Multicolor" },
  { key: "size", label: "size", hint: "méretarány / méretek" },
  { key: "material", label: "material", hint: "az anyagok listája" },
  { key: "ageGroup", label: "age_group", hint: "gyűjtői termék" },
  {
    key: "additionalImageLink",
    label: "additional_image_link",
    hint: "a többi kép a bélyegkép nélkül",
  },
  { key: "videoLink", label: "video_link", hint: "a 360°-os videó" },
];

const DERIVED_CUSTOM_LABELS: Array<{
  key: keyof FeedEntryFields;
  label: string;
  hint: string;
}> = [
  { key: "customLabel0", label: "custom_label_0", hint: "kategória" },
  { key: "customLabel1", label: "custom_label_1", hint: "címkék" },
  {
    key: "customLabel2",
    label: "custom_label_2",
    hint: "nyomtatási technológia",
  },
  { key: "customLabel3", label: "custom_label_3", hint: "méretek · arány" },
  { key: "customLabel4", label: "custom_label_4", hint: "elérhetőség" },
];

const MANUAL_LABELS: Array<{
  key: keyof FeedEntryFields;
  label: string;
  hint?: string;
}> = [
  {
    key: "googleProductCategory",
    label: "google_product_category",
    hint: "A Google termékkategória, ha a default nem pontos.",
  },
  { key: "gtin", label: "gtin", hint: "Vonal- vagy vonalkód (ha van)." },
  { key: "pattern", label: "pattern", hint: "Minta (pl. csíkos) — opcionális." },
  { key: "gender", label: "gender", hint: "Nem — opcionális." },
  { key: "salePrice", label: "sale_price", hint: "Akciós ár (pl. 39990 HUF)." },
  { key: "shipping", label: "shipping", hint: "Szállítási díj (pl. HUF:1990)." },
  { key: "weight", label: "weight", hint: "Súly (pl. 1200 g)." },
  {
    key: "unitPricingMeasure",
    label: "unit_pricing_measure",
    hint: "Egységár-mérték — opcionális.",
  },
  {
    key: "quantityToSellOnFacebook",
    label: "quantity_to_sell_on_facebook",
    hint: "Elérhető készlet darabszáma.",
  },
];

const GENDERS = ["", "male", "female", "unisex"];

const EMPTY: FeedEntryFields = {
  feedId: "",
  title: "",
  description: "",
  availability: "in stock",
  condition: "new",
  price: "",
  link: "",
  imageLink: "",
  brand: "",
  googleProductCategory: "",
  gtin: "",
  mpn: "",
  itemGroupId: "",
  color: "",
  size: "",
  material: "",
  pattern: "",
  gender: "",
  ageGroup: "",
  additionalImageLink: "",
  salePrice: "",
  customLabel0: "",
  customLabel1: "",
  customLabel2: "",
  customLabel3: "",
  customLabel4: "",
  videoLink: "",
  shipping: "",
  weight: "",
  unitPricingMeasure: "",
  quantityToSellOnFacebook: "",
};

export default function FeedEditorModal({
  productId,
  productTitle,
  open,
  inFeed,
  onClose,
  onSaved,
}: FeedEditorModalProps) {
  const [fields, setFields] = useState<FeedEntryFields>(EMPTY);
  // A feedben JELENLEG szereplő adatok pillanatképe — az előnézet ezt
  // mutatja, nem a szerkesztés alatt lévő (nem mentett) értékeket.
  const [savedFields, setSavedFields] = useState<FeedEntryFields>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [wasInFeed, setWasInFeed] = useState(inFeed);
  const [imageCheck, setImageCheck] = useState<{
    imageLink: FeedImageCheck;
    additional: FeedImageCheck[];
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof FeedEntryFields,>(
    key: K,
    value: FeedEntryFields[K]
  ) => setFields((f) => ({ ...f, [key]: value }));

  /** Betöltés: a tárolt bejegyzés, vagy a termékből generált default. */
  const load = async () => {
    try {
      const res = await fetch(
        `/api/admin/feed?productId=${encodeURIComponent(productId)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as
        | {
            inFeed?: boolean;
            fields?: FeedEntryFields;
            imageCheck?: {
              imageLink: FeedImageCheck;
              additional: FeedImageCheck[];
            };
            error?: string;
          }
        | null;
      if (!res.ok || !data) {
        setError(data?.error ?? "A feed adatok betöltése sikertelen.");
        setStatus("error");
        return;
      }
      setFields(data.fields ?? EMPTY);
      setSavedFields(data.fields ?? EMPTY);
      setWasInFeed(data.inFeed ?? false);
      setImageCheck(data.imageCheck ?? null);
      setError(null);
      setStatus("ready");
    } catch {
      setError("Hiba történt a feed adatok betöltése közben.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!open) return;
    // A betöltést microtask-ben indítjuk, hogy a setState ne az effect
    // szinkron törzsében fusson (react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  // Escape bezárás
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fókusz az első mezőre nyitáskor
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLInputElement>("input, select, textarea")
        ?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, status]);

  if (!open) return null;

  const handleSave = async () => {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, fields }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "A feltöltés sikertelen.");
        setStatus("error");
        return;
      }
      setWasInFeed(true);
      onSaved(true);
      onClose();
    } catch {
      setError("Hiba történt a feltöltés közben.");
      setStatus("error");
    }
  };

  const handleRemove = async () => {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/feed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        setError("Az eltávolítás sikertelen.");
        setStatus("error");
        return;
      }
      onSaved(false);
      onClose();
    } catch {
      setError("Hiba történt az eltávolítás közben.");
      setStatus("error");
    }
  };

  const busy = status === "saving";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Háttér */}
      <div
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="XML feed szerkesztése"
        className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 pb-4 shadow-2xl"
      >
        {/* Fejléc */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-5">            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                wasInFeed
                  ? "border-emerald-600/50 bg-emerald-600/10 text-emerald-400"
                  : "border-amber-600/50 bg-amber-600/10 text-amber-500"
              }`}
            >
              <Rss className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100">
                XML feed szerkesztése
              </h2>
              <p className="mt-0.5 max-w-xl truncate text-xs text-zinc-500">
                {productTitle}
                <span className="text-zinc-700"> · id: {productId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Bezárás"
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tartalom */}
        <div className="overflow-y-auto px-6 py-5">
          {status === "loading" && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              Adatok betöltése…
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-400">
              {error}
              <button
                type="button"
                onClick={() => void load()}
                className="ml-3 font-medium underline underline-offset-2 hover:text-red-300"
              >
                Újra
              </button>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-6">
              {imageCheck && (() => {
                const bad = [imageCheck.imageLink, ...imageCheck.additional].filter(
                  (c) => c.checked && !c.ok
                );
                if (bad.length === 0) return null;
                return (
                  <div className="rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-400">
                    <p className="flex items-center gap-2 font-medium">
                      <ImageOff className="h-4 w-4 shrink-0" />
                      A feedben nem létező képre mutató hivatkozás(ok) találhatók
                    </p>
                    <ul className="mt-1.5 list-inside list-disc space-y-0.5 font-mono text-xs">
                      {bad.map((c) => (
                        <li key={c.url}>{c.url}</li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs text-red-400/70">
                      A hibás képeket a termék szerkesztőjében cseréld le, a feed
                      automatikusan frissül.
                    </p>
                  </div>
                );
              })()}
              <p className="text-xs leading-5 text-zinc-500">
                A <span className="text-amber-500">lakatos mezők</span>{" "}
                automatikusan a termék aktuális adataiból töltődnek (cím, ár,
                elérhetőség, képek…) — ezek mindig frissülnek, ha a terméket
                szerkeszted. A{" "}
                <span className="text-zinc-300">feed-specifikus mezők</span>{" "}
                (akciós ár, GTIN, szállítás…) szabadon szerkeszthetők. A
                nyilvános feed:{" "}
                <code className="text-zinc-300">/feed/products.xml</code>
              </p>

              {/* Kötelező, de automatikus */}
              <Section
                title="Kötelező mezők (Meta) — automatikusan a termékből"
                hint="Ezek a Meta által kötelezően elvárt mezők; a termékadatokból frissülnek."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {DERIVED_REQUIRED.map(({ key, label, hint }) => (
                    <Field key={key} label={label}>
                      <ReadOnlyField
                        value={fields[key] as string}
                        hint={hint}
                      />
                    </Field>
                  ))}
                </div>
              </Section>

              {/* Opcionális — automatikus */}
              <Section
                title="Opcionális — automatikusan a termékből"
                hint="A többi termékinformáció (anyagok, méretek, címkék, technológia, videó) ezekbe került."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {DERIVED_OPTIONAL.map(({ key, label, hint }) => (
                    <Field key={key} label={label}>
                      <ReadOnlyField
                        value={fields[key] as string}
                        hint={hint}
                      />
                    </Field>
                  ))}
                  {DERIVED_CUSTOM_LABELS.map(({ key, label, hint }) => (
                    <Field key={key} label={label}>
                      <ReadOnlyField
                        value={fields[key] as string}
                        hint={hint}
                      />
                    </Field>
                  ))}
                </div>
              </Section>

              {/* Feed-specifikus, szerkeszthető */}
              <Section
                title="Feed-specifikus mezők — szabadon szerkeszthető"
                hint="Ezeknek nincs termék-megfelelőjük; a mentett értékeidet őrzik."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {MANUAL_LABELS.map(({ key, label, hint }) => (
                    <Field key={key} label={label} hint={hint}>
                      {key === "gender" ? (
                        <Select
                          value={fields[key] as string}
                          options={GENDERS}
                          onChange={(v) => update(key, v)}
                        />
                      ) : (
                        <TextInput
                          value={fields[key] as string}
                          onChange={(v) => update(key, v)}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Lábléc */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || status !== "ready"}
              onClick={() => setPreviewOpen(true)}
              title="Hogyan jelenik meg a termék a Meta hirdetésben"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-600/10 px-3 text-xs font-medium text-amber-500 transition-colors hover:border-amber-600/70 hover:bg-amber-600/20 disabled:opacity-50"
            >
              <Eye className="h-3.5 w-3.5" />
              Meta hirdetés előnézet
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStatus("loading");
                setError(null);
                void load();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-600/60 hover:text-amber-500 disabled:opacity-50"
            >
              Alapértékek újratöltése
            </button>
            {wasInFeed && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-600/50 px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/10 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Eltávolítás a feedből
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <span className="max-w-xs truncate text-xs text-red-400">
                {error}
              </span>
            )}
            <button
              type="button"
              disabled={busy || status !== "ready"}
              onClick={() => void handleSave()}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
                wasInFeed
                  ? "border border-emerald-600/60 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25"
                  : "bg-amber-600 text-zinc-950 hover:bg-amber-500"
              }`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {wasInFeed ? "Frissítés a feedben" : "Feltöltés a feedbe"}
            </button>
          </div>
        </div>

        {/* Meta hirdetés-előnézet réteg */}
        {previewOpen && status === "ready" && (
          <MetaAdPreview
            fields={savedFields}
            dirty={JSON.stringify(savedFields) !== JSON.stringify(fields)}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ===== Meta hirdetés-előnézet ===== */

interface ParsedPrice {
  amount: number | null;
  currency: string;
}

/** "24000 HUF" vagy "19 990 Ft" → szám + pénznem. */
function parsePrice(value: string): ParsedPrice {
  const t = value.trim();
  const m = t.match(/^([\d\s.,]+)\s*([^\d\s]+)?$/);
  if (!m) return { amount: null, currency: t };
  const num = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return { amount: Number.isFinite(num) ? num : null, currency: m[2] ?? "" };
}

function formatPrice(amount: number, currency: string): string {
  const n = new Intl.NumberFormat("hu-HU").format(amount);
  const upper = currency.toUpperCase();
  if (upper === "HUF" || currency === "Ft") return `${n} Ft`;
  if (upper === "EUR" || currency === "€") return `${n} €`;
  return currency ? `${n} ${currency}` : n;
}

function availabilityMeta(value: string): { label: string; className: string } {
  switch (value.trim()) {
    case "out of stock":
      return { label: "Elfogyott", className: "bg-red-50 text-red-600" };
    case "preorder":
      return { label: "Előrendelhető", className: "bg-amber-50 text-amber-700" };
    case "available for order":
      return { label: "Megrendelhető", className: "bg-blue-50 text-blue-600" };
    default:
      return { label: "Raktáron", className: "bg-emerald-50 text-emerald-600" };
  }
}

/** Facebook-stílusú egyképes hirdetés-makett a feed adataiból. */
function MetaAdPreview({
  fields,
  dirty,
  onClose,
}: {
  fields: FeedEntryFields;
  /** Van-e nem mentett módosítás a szerkesztőben (amit a feed még nem tartalmaz). */
  dirty: boolean;
  onClose: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const price = parsePrice(fields.price);
  const sale = fields.salePrice.trim() ? parsePrice(fields.salePrice) : null;
  const avail = availabilityMeta(fields.availability);
  const hasImage = fields.imageLink.trim() !== "";

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-zinc-950 pb-4">
      {/* Előnézet fejléc */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Megaphone className="h-4 w-4 text-amber-500" />
          Meta hirdetés előnézet
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-600/60 hover:text-amber-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vissza a szerkesztéshez
        </button>
      </div>

      {/* Hirdetés-makett */}
      <div className="flex-1 overflow-y-auto bg-zinc-900/40 p-6">
        {dirty && (
          <div className="mx-auto mb-4 flex max-w-sm items-start gap-2 rounded-lg border border-amber-600/40 bg-amber-600/10 px-3 py-2.5 text-xs leading-4 text-amber-400">
            <span className="mt-0.5">⚠</span>
            <span>
              Az előnézet a feedben <strong>jelenleg szereplő</strong> adatokat
              mutatja. A szerkesztés alatt lévő módosításaid a{" "}
              <strong>feltöltés után</strong> jelennek meg a hirdetésben.
            </span>
          </div>
        )}
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-2xl">
          {/* Reklám fejléc */}
          <div className="flex items-center gap-2.5 px-3 pt-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-600">
              {fields.brand.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-zinc-800">
                {fields.brand || "—"}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Megaphone className="h-3 w-3" />
                Reklám
              </p>
            </div>
          </div>

          {/* Kép */}
          <div className="relative mt-2.5 aspect-square w-full bg-zinc-100">
            {hasImage && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fields.imageLink}
                alt=""
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
                <ImageOff className="h-9 w-9" />
                <span className="text-xs font-medium">Nincs elérhető kép</span>
              </div>
            )}
          </div>

          {/* Ár + cím + leírás */}
          <div className="p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold leading-tight text-emerald-600">
                {price.amount !== null
                  ? formatPrice(price.amount, price.currency)
                  : fields.price || "—"}
              </span>
              {sale && sale.amount !== null && (
                <s className="text-sm text-zinc-400">
                  {formatPrice(sale.amount, sale.currency)}
                </s>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-900">
              {fields.title || "—"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-600">
              {fields.description || "—"}
            </p>
            <span
              className={`mt-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${avail.className}`}
            >
              {avail.label}
            </span>
          </div>

          {/* CTA */}
          <a
            href={fields.link || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between border-t border-zinc-200 px-3 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            Megnézem
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </a>
        </div>

        <p className="mx-auto mt-4 max-w-sm text-center text-[11px] leading-4 text-zinc-500">
          Illusztráció a feed adataiból — a tényleges megjelenés a Meta
          hirdetés-beállításoktól és a katalógus-feldolgozástól függ.
        </p>
      </div>
    </div>
  );
}

/* ===== Kis segédkomponensek ===== */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h3>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] text-zinc-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-zinc-600">{hint}</span>}
    </label>
  );
}

/** Automatikusan töltődő mező: lakat + a forrás megjelölése. */
function ReadOnlyField({ value, hint }: { value: string; hint: string }) {
  return (
    <div className="min-h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] text-amber-500/80">
        <Lock className="h-3 w-3" />
        {hint}
      </span>
      <p className="mt-0.5 break-all text-xs leading-4 text-zinc-300">
        {value || "— nincs —"}
      </p>
    </div>
  );
}

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
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
      className="h-9 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 focus:border-amber-600/60 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === "" ? "—" : opt}
        </option>
      ))}
    </select>
  );
}
