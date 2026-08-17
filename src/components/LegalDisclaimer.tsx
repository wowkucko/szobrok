import Link from "next/link";
import { FileText, Languages, Scale } from "lucide-react";
import { LEGAL_DOCS, type LegalLang } from "@/lib/legal";

interface LegalDisclaimerProps {
  lang: LegalLang;
}

// A jogi nyilatkozat (ÁSZF) oldala — a /aszf (magyar) és a /aszf/en (angol)
// útvonalon érhető el. A nyomtatásbarát elrendezés a weboldal prémium sötét
// stílusát követi.
export default function LegalDisclaimer({ lang }: LegalDisclaimerProps) {
  const doc = LEGAL_DOCS[lang];

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
          {/* Nyelvváltó */}
          <div className="mb-10 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-amber-500"
            >
              ← {lang === "hu" ? "Vissza a főoldalra" : "Back to home"}
            </Link>
            <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/60 p-1">
              <Languages className="ml-2 h-3.5 w-3.5 text-zinc-500" />
              <Link
                href="/aszf"
                aria-current={lang === "hu" ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  lang === "hu"
                    ? "bg-amber-600 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Magyar
              </Link>
              <Link
                href="/aszf/en"
                aria-current={lang === "en" ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  lang === "en"
                    ? "bg-amber-600 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                English
              </Link>
            </div>
          </div>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-10">
            {/* Fejléc */}
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-600/30 bg-amber-600/10">
                <Scale className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold leading-tight text-zinc-100 sm:text-3xl">
                  {doc.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {doc.subtitle}
                </p>
              </div>
            </div>

            {/* Figyelmeztetés */}
            <div className="mt-8 rounded-xl border border-amber-600/25 bg-amber-600/5 p-4">
              <p className="text-sm leading-6 text-amber-200/90">{doc.notice}</p>
            </div>

            {/* Szekciók */}
            <div className="mt-8 space-y-8">
              {doc.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-base font-semibold text-zinc-200">
                    {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-3 text-sm leading-7 text-zinc-400"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-3 space-y-2.5">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2.5 text-sm leading-6 text-zinc-400"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {/* Lábléc */}
            <div className="mt-10 flex items-center gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-600">
              <FileText className="h-3.5 w-3.5" />
              {doc.footer}
            </div>
          </article>

          <p className="mt-8 text-center text-xs text-zinc-600">
            {lang === "hu"
              ? "Utolsó frissítés: 2026"
              : "Last updated: 2026"}
          </p>
        </div>
      </main>
    </div>
  );
}
