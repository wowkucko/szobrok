"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  Info,
  LoaderCircle,
  Lock,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import Link from "next/link";
import type { Product } from "@/types/product";
import Checkbox from "@/components/Checkbox";
import PickupMap from "./PickupMap";

interface PurchaseModalProps {
  product: Product;
}

interface FormState {
  name: string;
  email: string;
  coupon: string;
}

type Errors = Partial<Record<keyof FormState | "terms", string>>;

const INITIAL: FormState = { name: "", email: "", coupon: "" };

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "Kérjük, add meg a neved.";
  if (!form.email.trim()) {
    errors.email = "Kérjük, add meg az e-mail címed.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ez nem tűnik érvényes e-mail címnek.";
  }
  return errors;
}

export default function PurchaseModal({ product }: PurchaseModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [accepted, setAccepted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openModal = () => {
    setForm(INITIAL);
    setErrors({});
    setStatus("idle");
    setAccepted(false);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // ESC bezárás + háttér-görgetés zárolása nyitott modálnál.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
    if (!accepted) {
      nextErrors.terms =
        "A vásárlási link kéréséhez fogadd el a jogi nyilatkozatot.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productTitle: product.title,
          name: form.name,
          email: form.email,
          coupon: form.coupon,
        }),
      });
      if (!res.ok) throw new Error("Hiba történt");
      setStatus("success");
    } catch {
      setStatus("success");
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
      >
        <ShoppingBag className="h-4 w-4" />
        Vásárlás
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Háttér */}
          <div
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Vásárlás"
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 pb-4 shadow-2xl"
          >
            {/* Fejléc */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-100">
                  Vásárlás
                </h2>
                <p className="mt-0.5 max-w-sm truncate text-xs text-zinc-500">
                  {product.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Bezárás"
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tartalom */}
            <div className="overflow-y-auto px-6 py-5">
              {status === "success" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CircleCheck className="h-12 w-12 text-amber-500" />
                  <h3 className="mt-4 text-lg font-semibold text-zinc-100">
                    Köszönjük az érdeklődést!
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                    24 órán belül e-mailben küldjük a{" "}
                    <span className="font-medium text-amber-500">
                      Meska piacteres linket
                    </span>
                    , ahol kényelmesen és biztonságosan fejezheted be a
                    vásárlásod.
                  </p>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
                  >
                    Bezárás
                  </button>
                </div>
              ) : (
                <>
                  {/* Meska SVG — ugyanaz, mint a főoldali Partner csempén */}
                  <div className="flex justify-center py-2">
                    <Image
                      src="/images/partner.svg"
                      alt="Meska"
                      width={600}
                      height={315}
                      className="h-auto max-h-20 w-auto max-w-[220px]"
                    />
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-300">
                    A termékek értékesítését a partnerünkön keresztül végezzük.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    Amennyiben szeretnéd megvásárolni a terméket a képek, videók
                    és leírás áttanulmányozását követően, kérlek az alábbi
                    mezőkben add meg a neved és email címed, ahova{" "}
                    <span className="font-medium text-zinc-200">
                      24 órán belül
                    </span>{" "}
                    kapsz egy{" "}
                    <span className="font-medium text-amber-500">
                      Meska piacteres linket
                    </span>
                    , ahol kényelmesen és biztonságosan fejezheted be a
                    vásárlásod.
                  </p>

                  {/* Feltételes átvételi / szállítási tájékoztató */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-600/25 bg-amber-600/5 p-4">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-xs leading-5 text-zinc-400">
                      {product.isShippable
                        ? "Kérlek vedd figyelembe, hogy ez a termék személyesen ingyenes átvehető, a szállítás azonban belföldi csomagautomatákban körülbelül 1500 Ft, melyet a Meska piactéren végigvitt vásárlásodnál tudsz rendezni."
                        : "Kérlek vedd figyelembe, hogy ez a termék kizárólag személyesen vehető át, szállítani biztonságosan nem lehetséges."}
                    </p>
                  </div>

                  {/* Interaktív térkép az átvételi pontokkal — mindkét ágon */}
                  <div className="mt-4">
                    <p className="text-xs font-medium text-zinc-400">
                      Személyes átvételi pontok
                    </p>
                    <PickupMap className="mt-2 h-64" />
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
                    <div>
                      <label
                        htmlFor="purchase-name"
                        className="mb-1.5 block text-sm font-medium text-zinc-300"
                      >
                        Név <span className="text-amber-500">*</span>
                      </label>
                      <input
                        id="purchase-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Teljes neved"
                        aria-invalid={Boolean(errors.name)}
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
                      />
                      {errors.name && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {errors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="purchase-email"
                        className="mb-1.5 block text-sm font-medium text-zinc-300"
                      >
                        E-mail cím <span className="text-amber-500">*</span>
                      </label>
                      <input
                        id="purchase-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="pelda@email.hu"
                        aria-invalid={Boolean(errors.email)}
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Kuponkód — opcionális, az akciós oldalon szerzett kedvezmény */}
                    <div>
                      <label
                        htmlFor="purchase-coupon"
                        className="mb-1.5 block text-sm font-medium text-zinc-300"
                      >
                        Kuponkód{" "}
                        <span className="text-zinc-500">(opcionális)</span>
                      </label>
                      <input
                        id="purchase-coupon"
                        type="text"
                        value={form.coupon}
                        onChange={(e) => set("coupon", e.target.value)}
                        autoComplete="off"
                        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm uppercase text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
                      />
                      <p className="mt-1.5 text-xs text-zinc-500">
                        Az akciós oldalon szerzett kedvezményes kódot itt adhatod
                        meg — a megrendelésnél érvényesítjük.
                      </p>
                    </div>

                    {/* ÁSZF elfogadás — csak bejelölés után aktív a küldés */}
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700">
                      <Checkbox
                        checked={accepted}
                        onChange={(checked) => {
                          setAccepted(checked);
                          if (checked && errors.terms) {
                            setErrors((prev) => ({ ...prev, terms: undefined }));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-xs leading-5 text-zinc-400">
                        Elfogadom a{" "}
                        <Link
                          href="/aszf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-amber-500 hover:text-amber-400"
                        >
                          jogi nyilatkozatot és az ÁSZF-et
                        </Link>
                        .
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="text-xs text-red-400">{errors.terms}</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending" || !accepted}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {status === "sending" ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Küldés…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Vásárlási link kérése
                        </>
                      )}
                    </button>
                    {!accepted && (
                      <p className="text-xs text-zinc-600">
                        A küldéshez előbb fogadd el a jogi nyilatkozatot.
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Lock className="h-3.5 w-3.5" />
                      Adataid csak a vásárlási link elküldéséhez használjuk.
                    </p>
                  </form>

                  <p className="mt-4 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-500">
                    A Meska működéséről további információkat itt találsz:{" "}
                    <a
                      href="https://Meska.hu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-amber-500 hover:text-amber-400"
                    >
                      https://Meska.hu
                    </a>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
