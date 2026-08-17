"use client";

import Link from "next/link";
import { useState } from "react";
import { Send } from "lucide-react";
import Checkbox from "./Checkbox";
import SectionHeading from "./SectionHeading";
import { CONTACT_EMAIL } from "@/lib/data";
import { SOCIAL_LINKS } from "./SocialBrand";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", { method: "POST", body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(
          typeof json?.error === "string"
            ? json.error
            : "Hiba történt a küldés során. Próbáld újra később."
        );
        return;
      }
      setStatus("sent");
      form.reset();
      setAccepted(false);
    } catch {
      setStatus("error");
      setError("Hiba történt a küldés során. Próbáld újra később.");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-amber-600";

  return (
    <section id="kapcsolat" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          index="04"
          title="Kapcsolat & ajánlatkérés"
          subtitle="Küldd el az ötleted, és 1–2 napon belül válaszolok."
        />
        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <div>
            {status === "sent" ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
                <h3 className="text-xl font-semibold text-zinc-100">
                  Köszönöm az üzeneted! 🎨
                </h3>
                <p className="mt-3 leading-7 text-zinc-400">
                  Hamarosan jelentkezem az ajánlatoddal. Addig is nézz szét a
                  galériában vagy a webshopban.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-300">
                      Név
                    </span>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="A neved"
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-300">
                      E-mail
                    </span>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="email@pelda.hu"
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-zinc-300">
                    Üzenet / Projekt leírása
                  </span>
                  <textarea
                    name="message"
                    required
                    rows={6}
                    placeholder="Írd le, mit szeretnél: figurát, méretet, stílust..."
                    className={`${inputClass} resize-y`}
                  />
                </label>
                <label className="block cursor-pointer">
                  <span className="text-sm font-medium text-zinc-300">
                    Melléklet (opcionális)
                  </span>
                  <input
                    type="file"
                    name="attachment"
                    className="mt-2 block w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-200 hover:file:bg-zinc-700"
                  />
                  <span className="mt-1 block text-xs text-zinc-500">
                    3D modell vagy referenciakép csatolásához
                  </span>
                </label>
                {status === "error" && error && (
                  <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700">
                  <Checkbox
                    checked={accepted}
                    onChange={setAccepted}
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
                <button
                  type="submit"
                  disabled={status === "sending" || !accepted}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-600 px-7 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "sending" ? "Küldés…" : "Elküldés"}
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Közvetlen elérhetőség
            </h3>
            <p className="mt-3 text-zinc-400">
              E-mail:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-amber-500 transition-colors hover:text-amber-400"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <h3 className="mt-10 text-lg font-semibold text-zinc-100">
              Kövess alkotás közben
            </h3>
            <p className="mt-3 max-w-md text-zinc-400">
              A festés folyamatáról folyamatosan posztolok — nézd meg, hogyan
              készülnek a darabok.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-3 rounded-full border border-zinc-700 px-5 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
                >
                  <social.Icon className="h-5 w-5" />
                  {social.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
