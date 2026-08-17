import { Lightbulb, Printer, Package } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { PROCESS_STEPS } from "@/lib/data";

const STEP_ICONS = [Lightbulb, Printer, Package];

export default function CommissionProcess() {
  return (
    <section
      id="megrendeles"
      className="scroll-mt-20 border-b border-zinc-800/60"
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          index="02"
          title="Egyedi megrendelés"
          subtitle="Saját ötlet vagy figura? Három egyszerű lépésben elkészül."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PROCESS_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8"
              >
                <span className="absolute right-6 top-6 font-mono text-sm text-zinc-600">
                  0{i + 1}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600/10 text-amber-500">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-zinc-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-12">
          <a
            href="#kapcsolat"
            className="inline-flex h-12 items-center justify-center rounded-full bg-amber-600 px-7 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
          >
            Egyedi ajánlatkérés
          </a>
        </div>
      </div>
    </section>
  );
}
