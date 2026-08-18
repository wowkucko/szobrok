"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mail, Send, XCircle } from "lucide-react";
import Checkbox from "./Checkbox";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hírlevél-feliratkozó űrlap — a feliratkozás a MailerLite-on keresztül megy
 *  (kettős opt-in megerősítő emailt a szolgáltatás küldi). GDPR: a beküldés
 *  csak a kifejezett hozzájárulás (aktív checkbox) mellett működik. */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && consent && state.kind !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), consent }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (res.ok && data.ok) {
        setState({ kind: "success", message: data.message ?? "Köszönjük a feliratkozást!" });
        setEmail("");
        setName("");
        setConsent(false);
      } else {
        setState({ kind: "error", message: data.error ?? "Hiba történt. Próbáld újra." });
      }
    } catch {
      setState({ kind: "error", message: "Hálózati hiba történt. Próbáld újra." });
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-600/30 bg-amber-600/10">
          <Mail className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Hírlevél</h3>
          <p className="text-xs text-zinc-500">
            Értesítés új darabokról és egyedi megrendelési lehetőségekről
          </p>
        </div>
      </div>

      {state.kind === "success" ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-sm leading-6 text-emerald-200/90">{state.message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4" noValidate>
          <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state.kind === "error") setState({ kind: "idle" });
              }}
              placeholder="E-mail címed"
              aria-label="E-mail cím"
              autoComplete="email"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Neved (opcionális)"
              aria-label="Név (opcionális)"
              autoComplete="name"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state.kind === "submitting" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Feliratkozom
            </button>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-zinc-500">
            <span className="mt-0.5">
              <Checkbox checked={consent} onChange={setConsent} sizeClassName="h-4 w-4" />
            </span>
            <span>
              Elolvastam és elfogadom az{" "}
              <Link
                href="/adatvedelem"
                target="_blank"
                className="text-amber-500 underline-offset-2 hover:underline"
              >
                Adatvédelmi tájékoztatót
              </Link>
              , és hozzájárulok, hogy hírlevelet kapjak. A leiratkozás bármikor,
              egy kattintással lehetséges a hírlevelek alján.
            </span>
          </label>

          {state.kind === "error" && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-600/30 bg-red-600/10 p-3.5">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm leading-6 text-red-200/90">{state.message}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
