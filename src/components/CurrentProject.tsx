/* eslint-disable @next/next/no-img-element */
import SectionHeading from "./SectionHeading";
import { getCurrentProject } from "@/lib/db";
import { cardThumbUrlFor } from "@/lib/imageUrls";

export default async function CurrentProject() {
  const project = getCurrentProject();
  if (!project) return null;

  const pct = Math.max(0, Math.min(100, Math.round(project.progress)));

  return (
    <section className="scroll-mt-20 border-b border-zinc-800/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          index="02"
          title="Jelenleg készül"
          subtitle="Egy ízelítő a műhelyben zajló munkából — így áll most a legfrissebb alkotás."
        />
        <div className="mt-12 grid items-center gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
            {project.image ? (
              <img
                src={cardThumbUrlFor(project.image)}
                alt={project.title}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-zinc-600">
                Nincs kép megadva
              </div>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {project.title}
            </h3>
            {project.description && (
              <p className="mt-4 whitespace-pre-line leading-7 text-zinc-300">
                {project.description}
              </p>
            )}
            <div className="mt-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Készültség</span>
                <span className="font-semibold text-amber-400">{pct}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
