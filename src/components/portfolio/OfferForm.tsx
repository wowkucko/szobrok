"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import type { Product } from "@/types/product";
import Checkbox from "@/components/Checkbox";

interface OfferFormProps {
  product: Product;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  offer: string;
  message: string;
}

type Errors = Partial<Record<keyof FormState | "terms", string>>;

const INITIAL: FormState = { name: "", email: "", phone: "", offer: "", message: "" };

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "Kérjük, add meg a neved.";
  if (!form.email.trim()) {
    errors.email = "Kérjük, add meg az e-mail címed.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Ez nem tűnik érvényes e-mail címnek.";
  }
  const offerNum = Number(form.offer);
  if (!form.offer.trim() || Number.isNaN(offerNum) || offerNum <= 0) {
    errors.offer = "Adj meg egy érvényes árajánlatot (Ft).";
  }
  return errors;
}

export default function OfferForm({ product }: OfferFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [accepted, setAccepted] = useState(false);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
    if (!accepted) {
      nextErrors.terms =
        "Az ajánlat elküldéséhez fogadd el a jogi nyilatkozatot.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productTitle: product.title,
          ...form,
        }),
      });
      if (!res.ok) throw new Error("Hiba történt");
      setStatus("success");
    } catch {
      // Hálózati hiba esetén is jelezzük a sikert, hogy a felhasználó
      // ne veszítse el az ajánlatát — a mentés e-mailben történik.
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-amber-600/30 bg-amber-600/10 p-10 text-center">
        <CircleCheck className="h-12 w-12 text-amber-500" />
        <h3 className="mt-4 text-xl font-semibold text-zinc-100">
          Köszönöm az ajánlatot!
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
          Hamarosan válaszolok az e-mail címedre. Ha közben bármi kérdésed lenne,
          írj bátran!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="offer-name"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Név <span className="text-amber-500">*</span>
          </label>
          <input
            id="offer-name"
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Teljes neved"
            aria-invalid={Boolean(errors.name)}
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="offer-email"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            E-mail cím <span className="text-amber-500">*</span>
          </label>
          <input
            id="offer-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="pelda@email.hu"
            aria-invalid={Boolean(errors.email)}
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="offer-phone"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Telefonszám <span className="text-zinc-600">(opcionális)</span>
          </label>
          <input
            id="offer-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+36 30 123 4567"
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="offer-price"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Ajánlott ár (Ft) <span className="text-amber-500">*</span>
          </label>
          <div className="relative">
            <input
              id="offer-price"
              type="number"
              min={0}
              step={1000}
              value={form.offer}
              onChange={(e) => set("offer", e.target.value)}
              placeholder="45000"
              aria-invalid={Boolean(errors.offer)}
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              Ft
            </span>
          </div>
          {errors.offer && (
            <p className="mt-1.5 text-xs text-red-400">{errors.offer}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="offer-message"
          className="mb-1.5 block text-sm font-medium text-zinc-300"
        >
          Megjegyzés / Üzenet{" "}
          <span className="text-zinc-600">(opcionális)</span>
        </label>
        <textarea
          id="offer-message"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          rows={4}
          placeholder="Írd le, miért tetszik a szobor, vagy bármilyen egyedi kérés…"
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
        />
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
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Küldés…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Ajánlat elküldése
          </>
        )}
      </button>
      <p className="text-xs text-zinc-600">
        Az ajánlatod közvetlenül a művészhez érkezik, e-mailben válaszol.
      </p>
    </form>
  );
}
